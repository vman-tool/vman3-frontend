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
  } | null = null;

  get coverageDays(): number {
    if (!this.dataOverview?.first_submission || !this.dataOverview?.last_submission) return 0;
    const first = new Date(this.dataOverview.first_submission);
    const last  = new Date(this.dataOverview.last_submission);
    if (isNaN(first.getTime()) || isNaN(last.getTime())) return 0;
    return Math.max(0, Math.round((last.getTime() - first.getTime()) / 86_400_000));
  }

  get coverageLabel(): string {
    const d = this.coverageDays;
    if (d === 0) return '—';
    if (d < 30) return `${d} day${d !== 1 ? 's' : ''}`;
    const months = Math.round(d / 30.44);
    return `${d} days (≈ ${months} month${months !== 1 ? 's' : ''})`;
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

  fmtDate(d: string | null | undefined): string {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Bar chart ─────────────────────────────────────────────────────────────
  public barChartLabels: string[] = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  public barChartData: any[] = [];
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
  ) {
    this.filterService = inject(FilterService);
    this.setupEffect();
  }

  setupEffect() {
    effect(() => {
      this.filterData = this.filterService.filterData();
      this.loadStatistics();
      this.loadMore();
    });
  }

  ngOnInit(): void {
    this.loadDqaKpis();
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

          this.dqaDuration     = this.fmtDqaMin(snap.aid?.overall?.avg ?? null);
          this.dqaDurationCount = snap.aid?.overall?.count ?? 0;
          this.dqaDurationTier  = this.thresholdSvc.classifyAid(snap.aid?.overall?.avg ?? null);

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
    const yearMap = new Map<number, number[]>();
    monthly_submissions?.forEach((s) => {
      if (s.year !== null && s.month !== null) {
        if (!yearMap.has(s.year)) yearMap.set(s.year, new Array(12).fill(0));
        yearMap.get(s.year)![s.month - 1] = s.count;
      }
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
      datasets.push({
        type: 'line',
        label: 'Target',
        data: new Array(12).fill(monthlyTarget),
        borderColor: '#DC2626',
        backgroundColor: '#DC2626',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        order: 0,
      });
    }
    this.barChartData = datasets;
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
          this.processBarChartData(data.data.monthly_submissions, data.data.monthly_target);
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
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        (error) => {
          this.errorMessage = error.message;
          this.isLoading = false;
        }
      );
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
