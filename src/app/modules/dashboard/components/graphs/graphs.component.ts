import {
  Component,
  OnInit,
  ChangeDetectorRef,
  effect,
  inject,
} from '@angular/core';
import {
  BubbleDataPoint,
  ChartData,
  ChartOptions,
  ChartType,
  Point,
} from 'chart.js';
import 'chartjs-plugin-datalabels';
import { ChartsService } from '../../services/charts/charts.service';
import { MonthlySubmission } from '../../interface';
import { DataFilterComponent } from '../../../../shared/dialogs/filters/data-filter/data-filter/data-filter.component';
import { MatDialog } from '@angular/material/dialog';
import { FilterService } from '../../../../shared/services/filter.service';
import { CcvaService } from '../../../ccva/services/ccva.service';
import {
  GeneralDqaService,
  GroupedStats,
  IciStats,
  DqaSnapshot,
} from '../../../data-quality/services/general-dqa.service';
import { DqaThresholdService, StatusBadge as TierBadge } from '../../../data-quality/services/dqa-threshold.service';
import { LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';
import { SettingConfigService } from '../../../settings/services/settings_configs.service';

@Component({
  standalone: false,
  selector: 'app-graphs',
  templateUrl: './graphs.component.html',
  styleUrls: ['./graphs.component.scss'],
})
export class GraphsComponent implements OnInit {
  graphData: any = {};
  filterData: {
    locations: LocationSelection[];
    start_date?: string;
    end_date?: string;
    date_type?: string;
  } = {
    locations: [],
    start_date: undefined,
    end_date: undefined,
    date_type: undefined,
  };

  // ── Dataset Overview ──────────────────────────────────────────────────────
  dataOverview: {
    total: number;
    first_submission: string | null;
    last_submission: string | null;
    distinct_regions: number;
    distinct_districts: number;
    consented: number;
  } | null = null;

  // ── Participation (Consent / No Consent / Percent) ──────────────────────
  get consentedCount(): number {
    return this.dataOverview?.consented ?? 0;
  }

  get notConsentedCount(): number {
    const total = this.dataOverview?.total;
    if (!total) return 0;
    return Math.max(0, total - this.consentedCount);
  }

  get consentPercentLabel(): string {
    const total = this.dataOverview?.total;
    if (!total) return '—';
    return `${Math.round((this.consentedCount / total) * 100)}%`;
  }

  get coverageDays(): number {
    if (!this.dataOverview?.first_submission || !this.dataOverview?.last_submission) return 0;
    const first = new Date(this.dataOverview.first_submission);
    const last  = new Date(this.dataOverview.last_submission);
    if (isNaN(first.getTime()) || isNaN(last.getTime())) return 0;
    return Math.max(0, Math.round((last.getTime() - first.getTime()) / 86_400_000));
  }

  get coverageDaysLabel(): string {
    const d = this.coverageDays;
    if (d === 0) return '—';
    return `${d} day${d !== 1 ? 's' : ''}`;
  }

  get coverageMonthsLabel(): string {
    const d = this.coverageDays;
    if (d < 30) return '';
    const months = Math.round(d / 30.44);
    return `~ ${months} month${months !== 1 ? 's' : ''}`;
  }

  // One space-joined string (not a template <br>) so the browser's normal
  // text wrapping decides the line break - two lines in this card's narrow
  // Span column, naturally collapsing to one line wherever there's enough
  // width for both. A single interpolation also avoids the stray leading/
  // trailing whitespace a `{{a}} <br> {{b}}` template produces around each
  // line, which was throwing off text-align: center between the two lines.
  get coverageSpanLabel(): string {
    const months = this.coverageMonthsLabel;
    return months ? `${this.coverageDaysLabel}, ${months}` : this.coverageDaysLabel;
  }

  get avgPerDay(): string {
    const d = this.coverageDays;
    if (!d || !this.dataOverview?.total) return '—';
    return (this.dataOverview.total / d).toFixed(1);
  }

  get avgPerWeek(): string {
    const d = this.coverageDays;
    if (!d || !this.dataOverview?.total) return '—';
    return ((this.dataOverview.total / d) * 7).toFixed(1);
  }

  get avgPerMonth(): string {
    const d = this.coverageDays;
    if (!d || !this.dataOverview?.total) return '—';
    return Math.round((this.dataOverview.total / d) * 30.44).toLocaleString();
  }

  // Geographic Coverage card labels - this deployment's own admin-level
  // names (e.g. "Province"/"District", "Region"/"District", "State"/
  // "County"), not the fixed "Regions"/"Districts" wording this used to be
  // hardcoded to, since that pairing doesn't hold for every country this
  // app is deployed in. Pluralized the simple way (append "s") since every
  // admin-level label configured so far is a plain noun; falls back to the
  // generic admin-level-1/2 wording only if a deployment hasn't configured
  // one, same fallback style used elsewhere (e.g. VaFiltersComponent).
  adminLevel1Label = 'Admin Level 1';
  adminLevel2Label = 'Admin Level 2';

  get adminLevel1LabelPlural(): string {
    return this.pluralize(this.adminLevel1Label);
  }

  get adminLevel2LabelPlural(): string {
    return this.pluralize(this.adminLevel2Label);
  }

  private pluralize(label: string): string {
    return label.endsWith('s') ? label : `${label}s`;
  }

  fmtDate(d: string | null | undefined): string {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Bar chart ─────────────────────────────────────────────────────────────
  private readonly monthAbbreviations = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  public barChartLabels: string[] = [...this.monthAbbreviations];
  public barChartData: any[] = [];

  // This chart's own x-axis basis, independent of the global Date Type
  // filter (va-filters) - submitted_date by default, or death_date when
  // switched locally. Only this chart's query is re-run on a switch; the
  // rest of the dashboard (age/gender distribution, dataset overview) keeps
  // using the global filter's own date type, same as before.
  monthlySubmissionsViewOptions: { value: string; label: string }[] = [
    { value: 'submission_date', label: 'Submission Date' },
    { value: 'death_date', label: 'Date of Death' },
  ];
  monthlySubmissionsViewMode: string = 'submission_date';
  isMonthlySubmissionsLoading: boolean = false;

  public doughnutChartData: ChartData<'doughnut'> = {
    labels: ['Neonates', 'Children', 'Adults'],
    datasets: [{ data: [], backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'] }],
  };
  public errorMessage: string = '';
  public isLoading: boolean = true;

  // ── DQA KPI state ─────────────────────────────────────────────────────────
  rrsStats:      GroupedStats | null = null;
  icsStats:      GroupedStats | null = null;
  durationStats: GroupedStats | null = null;
  iciStats:      IciStats     | null = null;

  isDqaRrsLoading      = true;
  isDqaIcsLoading      = true;
  isDqaDurationLoading = true;
  isDqaIciLoading      = true;

  hasDqaRrsError      = false;
  hasDqaIcsError      = false;
  hasDqaDurationError = false;
  hasDqaIciError      = false;

  dqaComputedAt: string | null = null;

  // ── DQA derived values (stable properties, set once in loadDqaKpis) ────────
  dqaRrs:          string       = '--';
  dqaRrsCount:     number       = 0;
  dqaRrsTier:      TierBadge | null = null;

  dqaIcs:          string       = '--';
  dqaIcsCount:     number       = 0;
  dqaIcsTier:      TierBadge | null = null;

  dqaIci:          string       = '--';
  dqaIciTotal:     number       = 0;
  dqaIciPassed:    number       = 0;
  dqaIciTier:      TierBadge | null = null;

  dqaDuration:     string       = '--';
  dqaDurationCount: number      = 0;
  dqaDurationTier: TierBadge | null = null;

  // ── DQA formatters ────────────────────────────────────────────────────────
  fmtDqaMin(v: number | null): string {
    if (v === null || v === undefined) return '--';
    const m = Math.round(v);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r === 0 ? `${h}h` : `${h}h ${r}m`;
  }
  // ICS already arrives as a percentage (0-100) from compute_ics, like ICI and
  // RRS below. Multiplying by 100 here rendered 98.5% as 9854.2%.
  fmtDqaPct(v: number | null): string {
    if (v === null || v === undefined) return '--';
    return `${v.toFixed(1)}%`;
  }
  fmtDqaRrs(v: number | null): string {
    if (v === null || v === undefined) return '--';
    return `${v.toFixed(1)} / 100`;
  }
  fmtDqaIci(v: number | null): string {
    if (v === null || v === undefined) return '--';
    return `${v.toFixed(1)}%`;
  }

  constructor(
    public chartsService: ChartsService,
    private cdr: ChangeDetectorRef,
    private ccvaService: CcvaService,
    private filterService: FilterService,
    private dqaService: GeneralDqaService,
    private thresholdSvc: DqaThresholdService,
    private settingConfigService: SettingConfigService,
  ) {
    this.filterService = inject(FilterService);
    this.setupEffect();
  }

  setupEffect() {
    effect(() => {
      this.filterData = this.filterService.filterData();
      this.loadStatistics();
      this.loadMonthlySubmissionsChart();
      this.loadMore();
    });
  }

  ngOnInit(): void {
    this.loadDqaKpis();
    this.loadAdminLevelLabels();
  }

  loadAdminLevelLabels(): void {
    // Cached by SettingConfigService (and already fetched by the
    // <app-va-filters> sibling on this same page), so this is effectively
    // a free cache hit, not an extra network round trip.
    this.settingConfigService.getSettingsConfig().subscribe({
      next: (data) => {
        if (data?.system_configs?.admin_level1) this.adminLevel1Label = data.system_configs.admin_level1;
        if (data?.system_configs?.admin_level2) this.adminLevel2Label = data.system_configs.admin_level2;

        // "Submission by DoD" only makes sense when this deployment actually
        // maps a date-of-death field (field_mapping.death_date, often
        // id10023) - without it the backend has no column to group by.
        if (!data?.field_mapping?.death_date) {
          this.monthlySubmissionsViewOptions = this.monthlySubmissionsViewOptions.filter(
            (o) => o.value !== 'death_date'
          );
        }
      },
    });
  }

  loadDqaKpis(): void {
    this.dqaService.getAnalyticsSnapshot().subscribe({
      next: r => {
        const snap: DqaSnapshot | null = r?.data ?? null;
        const clearLoading = () => {
          this.isDqaRrsLoading = this.isDqaIcsLoading = this.isDqaDurationLoading = this.isDqaIciLoading = false;
        };
        if (snap?.status === 'completed') {
          this.rrsStats      = snap.rrs;
          this.icsStats      = snap.ics;
          this.iciStats      = snap.ici;
          this.durationStats = snap.aid;
          this.dqaComputedAt = snap.computed_at ?? null;

          this.dqaRrs          = this.fmtDqaRrs(snap.rrs?.overall?.avg ?? null);
          this.dqaRrsCount     = snap.rrs?.overall?.count ?? 0;
          this.dqaRrsTier      = this.thresholdSvc.classifyRrs(snap.rrs?.overall?.avg ?? null);

          this.dqaIcs          = this.fmtDqaPct(snap.ics?.overall?.avg ?? null);
          this.dqaIcsCount     = snap.ics?.overall?.count ?? 0;
          this.dqaIcsTier      = this.thresholdSvc.classifyIcs(snap.ics?.overall?.avg ?? null);

          this.dqaIci          = this.fmtDqaIci(snap.ici?.overall_ici ?? null);
          this.dqaIciTotal     = snap.ici?.overall_total  ?? 0;
          this.dqaIciPassed    = snap.ici?.overall_passed ?? 0;
          this.dqaIciTier      = this.thresholdSvc.classifyIci(snap.ici?.overall_ici ?? null);

          // Median, not mean - interview durations are right-skewed, so the
          // median is the representative "typical interview" statistic
          // (matches the General DQA page and the vman_dq manuscript's own
          // Median Interview Duration (MID) definition).
          this.dqaDuration     = this.fmtDqaMin(snap.aid?.overall?.p50 ?? null);
          this.dqaDurationCount = snap.aid?.overall?.count ?? 0;
          this.dqaDurationTier  = this.thresholdSvc.classifyAid(snap.aid?.overall?.p50 ?? null);

          clearLoading();
        } else if (snap?.status === 'running') {
          // keep spinners — snapshot is still being computed
        } else if (snap?.status === 'failed') {
          this.hasDqaRrsError = this.hasDqaIcsError = this.hasDqaDurationError = this.hasDqaIciError = true;
          clearLoading();
        } else {
          clearLoading();
        }
      },
      error: () => {
        this.hasDqaRrsError = this.hasDqaIcsError = this.hasDqaDurationError = this.hasDqaIciError = true;
        this.isDqaRrsLoading = this.isDqaIcsLoading = this.isDqaDurationLoading = this.isDqaIciLoading = false;
      },
    });
  }

  public barChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom', align: 'center', fullSize: true, maxHeight: 100 },
    },
  };
  public barChartType: ChartType = 'bar';
  public barChartLegend = true;

  public doughnutChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom', align: 'center', fullSize: true },
      tooltip: {
        callbacks: {
          label(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data?.reduce((acc: number, val: any) => acc + val, 0);
            const pct = ((Number(value) / (Number(total) ?? 0)) * 100).toFixed(2) + '%';
            return ` ${label} ${pct} (N = ${value.toLocaleString()})  `;
          },
        },
      },
      datalabels: {
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data?.reduce(
            (acc: number, v: number | [number, number] | Point | BubbleDataPoint | null) => {
              if (typeof v === 'number') return acc + v;
              if (Array.isArray(v)) return acc + v[0];
              if (v && typeof v === 'object') return acc + (v as Point).x;
              return acc;
            }, 0);
          return ((value / total) * 100).toFixed(2) + '';
        },
        color: '#fff',
        font: { weight: 'bold' },
      },
    },
  };
  public doughnutChartLabels = ['Neonates', 'Children', 'Adults'];
  public doughnutChartType: ChartType = 'doughnut';
  public doughnutChartLegend = true;

  // Distinct fill colors per year's bar dataset - Chart.js 4's built-in
  // `colors` plugin only auto-assigns colors when NONE of a chart's datasets
  // specify one; once the Target line dataset below sets its own borderColor,
  // that plugin stops colorizing the whole chart, leaving every bar dataset
  // in the default gray unless it's given an explicit color too.
  private readonly barColorPalette: string[] = [
    '#36A2EB', '#4BC0C0', '#9966FF', '#FF9F40', '#4CAF50', '#FFCE56', '#C9CBCF', '#E91E63',
  ];

  // monthlyTarget is the annual expected-deaths total (summed across the
  // whole expected_deaths hierarchy, from Settings > Configuration > Data
  // Dictionary > Expected Number of Deaths) already divided by 12 by the
  // backend - rendered as a flat reference line across all 12 months.
  // Chart.js 4 supports a mixed `type: 'line'` dataset inside a `type: 'bar'`
  // chart natively, so no annotation plugin is needed for this.
  processBarChartData(monthly_submissions: MonthlySubmission[], monthlyTarget?: number | null) {
    const rows = (monthly_submissions ?? []).filter((s) => s.year !== null && s.month !== null);
    const distinctYears = new Set(rows.map((s) => s.year));

    // A date field with a wide historical spread (e.g. date of death, which
    // can go back decades) produces one bar dataset per distinct year. Laid
    // out as colored sub-bars within 12 fixed month slots, more than a
    // handful of years makes each bar a near-invisible sliver rather than a
    // readable vertical bar. Past that point, switch to a single flat
    // timeline (oldest to newest) instead - same bar chart style, still
    // genuine vertical bars, just one bar per month actually present in the
    // data rather than competing for a slice of 12 fixed slots.
    if (distinctYears.size > this.barColorPalette.length) {
      this.renderChronologicalBarChart(rows, monthlyTarget);
      return;
    }

    this.barChartLabels = [...this.monthAbbreviations];
    const yearMap = new Map<number, number[]>();
    rows.forEach((s) => {
      if (!yearMap.has(s.year!)) yearMap.set(s.year!, new Array(12).fill(0));
      yearMap.get(s.year!)![s.month! - 1] = s.count;
    });
    const datasets: any[] = Array.from(yearMap.entries()).map(([year, counts], index) => {
      const color = this.barColorPalette[index % this.barColorPalette.length];
      return {
        data: counts,
        label: year.toString(),
        backgroundColor: color,
        borderColor: color,
      };
    });
    if (monthlyTarget != null) {
      datasets.push(this.targetLineDataset(new Array(12).fill(monthlyTarget)));
    }
    this.barChartData = datasets;
  }

  private renderChronologicalBarChart(rows: MonthlySubmission[], monthlyTarget?: number | null) {
    const sorted = [...rows].sort((a, b) => (a.year! - b.year!) || (a.month! - b.month!));
    this.barChartLabels = sorted.map((s) => `${this.monthAbbreviations[s.month! - 1]} ${s.year}`);
    const datasets: any[] = [{
      data: sorted.map((s) => s.count),
      label: 'Submissions',
      backgroundColor: this.barColorPalette[0],
      borderColor: this.barColorPalette[0],
    }];
    if (monthlyTarget != null) {
      datasets.push(this.targetLineDataset(new Array(sorted.length).fill(monthlyTarget)));
    }
    this.barChartData = datasets;
  }

  private targetLineDataset(data: number[]) {
    return {
      type: 'line',
      label: 'Target',
      data,
      borderColor: '#DC2626',
      backgroundColor: '#DC2626',
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      order: 0,
    };
  }

  loadStatistics() {
    this.isLoading = true;
    this.chartsService
      .getChartfetchStatistics(
        this.filterData.start_date,
        this.filterData.end_date,
        this.filterData.locations,
        this.filterData.date_type
      )
      .subscribe(
        (data) => {
          this.doughnutChartData = {
            ...this.doughnutChartData,
            datasets: [{
              ...this.doughnutChartData.datasets[0],
              data: [
                data.data.distribution_by_age.neonates,
                data.data.distribution_by_age.children,
                data.data.distribution_by_age.adults,
              ],
            }],
          };
          this.polarAreaChartData = {
            ...this.polarAreaChartData,
            datasets: [{
              ...this.polarAreaChartData.datasets[0],
              data: [
                data.data.distribution_by_gender.male  || 0,
                data.data.distribution_by_gender.female || 0,
                data.data.distribution_by_gender.other  || 0,
              ],
            }],
          };
          this.dataOverview = data.data.data_overview ?? null;
          this.deathPyramidBuckets = data.data.death_pyramid?.buckets ?? [];
          this.deathPyramidOtherSexExcluded = data.data.death_pyramid?.other_sex_excluded ?? 0;
          this.buildDeathPyramidChart();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        (error) => {
          this.errorMessage = error.message;
          this.isLoading = false;
        }
      );
  }

  onMonthlySubmissionsViewChange(value: string): void {
    this.monthlySubmissionsViewMode = value;
    this.loadMonthlySubmissionsChart();
  }

  loadMonthlySubmissionsChart(): void {
    this.isMonthlySubmissionsLoading = true;
    this.chartsService
      .getChartfetchStatistics(
        this.filterData.start_date,
        this.filterData.end_date,
        this.filterData.locations,
        this.monthlySubmissionsViewMode
      )
      .subscribe({
        next: (data) => {
          this.processBarChartData(data.data.monthly_submissions, data.data.monthly_target);
          this.isMonthlySubmissionsLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error.message;
          this.isMonthlySubmissionsLoading = false;
        },
      });
  }

  // ── Polar Area ────────────────────────────────────────────────────────────
  public polarAreaChartType: ChartType = 'polarArea';
  public polarAreaChartData: ChartData<'polarArea'> = {
    labels: ['Male', 'Female', 'Unspecified'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: [
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 99, 132, 0.5)',
        'rgba(255, 206, 86, 0.5)',
      ],
      borderColor: ['#36A2EB', '#FF6384', '#FFCE56'],
      borderWidth: 1,
    }],
  };
  public polarAreaChartOptions: ChartOptions<'polarArea'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { autoPadding: true },
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          callback: (v: number | string) =>
            typeof v === 'number' ? v.toLocaleString() : v,
        },
      },
    },
    plugins: {
      legend: { display: true, position: 'bottom', align: 'center', fullSize: true, maxHeight: 100 },
      tooltip: {
        callbacks: {
          label(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((acc: number, val: any) => acc + val, 0);
            const pct = ((Number(value) / (Number(total) ?? 0)) * 100).toFixed(2) + '%';
            return `${label} ${pct} (N=${value.toLocaleString()})`;
          },
        },
      },
      datalabels: {
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce(
            (acc: number, v: number | [number, number] | Point | BubbleDataPoint | null) => {
              if (typeof v === 'number') return acc + v;
              if (Array.isArray(v)) return acc + v[0];
              if (v && typeof v === 'object') return acc + (v as Point).x;
              return acc;
            }, 0);
          return `${value.toLocaleString()} (${((value / total) * 100).toFixed(2)}%)`;
        },
        labels: {},
        color: '#fff',
        offset: 10,
        font: { weight: 'bold' },
      },
    },
  };

  // ── Death Pyramid ─────────────────────────────────────────────────────────
  deathPyramidBuckets: { bucket: string; male: number; female: number }[] = [];
  deathPyramidOtherSexExcluded = 0;
  includeUnknownAge = true;

  public deathPyramidChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  public deathPyramidChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          // Male values are stored negated so their bars extend left - never
          // show that minus sign to the user.
          callback: (v: number | string) => Math.abs(Number(v)).toLocaleString(),
        },
      },
    },
    plugins: {
      legend: { display: true, position: 'bottom', align: 'center', fullSize: true },
      tooltip: {
        callbacks: {
          label(context) {
            const label = context.dataset.label || '';
            const value = Math.abs(Number(context.raw) || 0);
            return ` ${label}: ${value.toLocaleString()}`;
          },
        },
      },
    },
  };

  onToggleUnknownAge(): void {
    this.includeUnknownAge = !this.includeUnknownAge;
    this.buildDeathPyramidChart();
  }

  // Oldest ("80+") at the top, youngest ("0-4") at the bottom - standard
  // population-pyramid reading order. "Unknown" (the backend's last bucket)
  // is appended below "0-4" when shown; toggling it is a pure client-side
  // filter over the already-fetched buckets, no re-fetch from the backend.
  private buildDeathPyramidChart(): void {
    const known = this.deathPyramidBuckets.filter((b) => b.bucket !== 'Unknown').reverse();
    const unknown = this.includeUnknownAge
      ? this.deathPyramidBuckets.filter((b) => b.bucket === 'Unknown')
      : [];
    const ordered = [...known, ...unknown];

    this.deathPyramidChartData = {
      labels: ordered.map((b) => b.bucket),
      datasets: [
        { label: 'Male', data: ordered.map((b) => -b.male || 0), backgroundColor: '#36A2EB' },
        { label: 'Female', data: ordered.map((b) => b.female), backgroundColor: '#FF6384' },
      ],
    };
  }

  async loadMore() {
    this.ccvaService.get_ccva_Results().subscribe({
      next: (data: any) => { this.isLoading = false; this.graphData = data.data; },
      error: () => { this.isLoading = false; },
    });
  }

  downloadChart(key: string) {
    const el = document.querySelector(`#${key} canvas`) as HTMLCanvasElement;
    if (el) {
      const link = document.createElement('a');
      link.href = el.toDataURL('image/png');
      link.download = `${key}-chart.png`;
      link.click();
    }
  }
}
