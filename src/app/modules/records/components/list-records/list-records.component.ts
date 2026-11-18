import {
  Component,
  effect,
  HostListener,
  inject,
  OnInit,
  runInInjectionContext,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChartDataset, ChartOptions } from 'chart.js';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ListRecordsService } from '../../services/list-records/list-records.service';
import { DataFilterComponent } from '../../../../shared/dialogs/filters/data-filter/data-filter/data-filter.component';
import { FilterService } from '../../../../shared/services/filter.service';
import { ViewVaComponent } from 'app/shared/dialogs/view-va/view-va.component';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';
import { VaRecordMapPoint } from '../va-record-map-view/va-record-map-view.component';
import { colorForGroup, colorMapForValues } from '../../../../shared/utils/group-colors';
import { GeneralDqaService } from 'app/modules/data-quality/services/general-dqa.service';
import { DqaThresholdService, StatusBadge } from 'app/modules/data-quality/services/dqa-threshold.service';

type VaRecordVizType = 'table' | 'pie' | 'bar' | 'map';
// Table 1 ('cause'): VA Records + Cause of Death by GBD. Table 2 ('dqa'):
// the same VA records scored against the 4 Data Quality Indicators instead
// - set by records-routing.module.ts's `data: { mode }` on each child
// route, read in ngOnInit(). Everything else (search, the global date/
// location filter, paging, sort, the viz switcher) is identical between
// the two - only the "extra" Filter By/Group By dimensions and the
// trailing table columns differ.
type VaRecordsTableMode = 'cause' | 'dqa';
@Component({
  standalone: false,
  selector: 'app-list-records',
  templateUrl: './list-records.component.html',
  styleUrls: ['./list-records.component.scss'],
})
export class ListRecordsComponent implements OnInit {
  mode: VaRecordsTableMode = 'cause';
  title: string = 'VA Data';
  data: any[] = [];
  isLoading: boolean = false;
  // Defaults to "None" - no search field selected, so there's nothing
  // meaningful to type into Search Value (disabled in the template while
  // this is 'none'; see onSearchByChange()).
  searchBy: string = 'none';
  searchValue: string = '';
  pageNumber: number = 0;
  pageSizeOptions = [10, 20, 50, 100]
  limit: number = 10;
  paging?: boolean;
  totalRecords: number = 0;
  message: string = '';
  error: string | null = null;
  locationLevel1Label: string = 'Region';
  locationLevel2Label: string = 'District';
  // Plain field, not a getter - app-custom-dropdown's *ngFor over a getter
  // that returns a new array literal every change-detection pass breaks
  // trackBy identity and free-runs into NG0103 (same reasoning as every
  // other options array in this codebase, e.g. groupLevelOptions in
  // submissions.component.ts). Rebuilt via refreshSearchByOptions() once
  // the real admin-level labels load.
  // VA ID and Instance ID are two independently-configurable fields
  // (Settings > Configuration > Field Mapping) - a value copied from the
  // table may have come from either, so both are offered as distinct
  // search-by options rather than one standing in for the other.
  searchByOptions: { value: string; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'vaId', label: 'VA ID' },
    { value: 'instanceId', label: 'Instance ID' },
    { value: 'location_level1', label: 'Region' },
    { value: 'location_level2', label: 'District' },
    { value: 'interviewer_name', label: 'Interviewer' },
  ];
  filterData: { locations: LocationSelection[]; startDate?: string; endDate?: string } = {
    locations: [],
    startDate: undefined,
    endDate: undefined,
  };

  // Broad/Major/Specific Cause + Algorithm - denormalized from whichever
  // CCVA run is marked default (CCVA > Display Data > Set Default). A VA
  // with no result under that run shows "-" for all 4 (see the table
  // template). Sort is click-the-column-header, same gesture as every
  // other sortable table in this app (e.g. CCVA's own Display Data table).
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  filterBy = 'none';
  filterValue = '';
  // Shared Gender/Age Group entries, plus the "extra" dimensions that
  // depend on which table this is - set in ngOnInit() once `mode` is
  // known, since a static field initializer runs before that. Group By
  // is aliased to this exact same array (not a copy) so the two dropdowns
  // never drift apart, same as before.
  filterByChoices: { value: string; label: string; title?: string }[] = [];
  filterValueChoices: { value: string; label: string }[] = [{ value: '', label: 'All' }];
  private ccvaFilterOptions: {
    broad: string[]; major: string[]; specific: string[]; gender: string[]; age_group: string[];
    rrs: string[]; ics: string[]; ici: string[]; aid: string[];
  } = {
    broad: [], major: [], specific: [], gender: [], age_group: [],
    rrs: [], ics: [], ici: [], aid: [],
  };

  // Group By - same fields as Filter By, aliased to the exact same array
  // so the two dropdowns' options never drift apart. When set, the
  // individual-record table is replaced by a Group/Count/Percentage
  // summary (same behavior as CCVA's own Display Data table's Group By),
  // honoring every other active filter (date range/location/search/
  // Filter By-Value) the same way the individual list does.
  groupBy = 'none';
  groupByChoices: { value: string; label: string; title?: string }[] = [];
  groupedData: { group: string; count: number }[] = [];
  groupedTotal = 0;
  isLoadingGrouped = false;

  // Table 2 only - true once we know DQA analytics hasn't completed a run
  // yet, so these 4 columns/dimensions have nothing to show. null while
  // the check itself is still in flight (no banner shown either way).
  dqaAnalyticsStatus: 'completed' | 'running' | 'failed' | null = null;

  // Table/Pie/Bar/Map switcher, same control/placement as CCVA's own
  // Display Data table (next to Group By). Pie/Bar chart the Group By
  // summary, so they're only meaningful once a Group By is set (gated in
  // onVizTypeChange() and the template); Map is independent of Group By -
  // it fetches its own GPS points regardless, only their coloring depends
  // on it (handled reactively by app-va-record-map-view's own [groupBy]
  // input).
  vizType: VaRecordVizType = 'table';
  mapPoints: VaRecordMapPoint[] = [];
  isLoadingMap = false;

  public groupChartData: ChartDataset[] = [];
  public groupChartLabels: string[] = [];
  public groupBarChartOptions: ChartOptions = {
    responsive: true,
    indexAxis: 'y',
    maintainAspectRatio: false,
    scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true, callbacks: { label: ctx => this.chartTooltipLabel(ctx) } },
    },
  };
  public groupPieChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'right' },
      tooltip: { enabled: true, callbacks: { label: ctx => this.chartTooltipLabel(ctx) } },
    },
  };

  // Column visibility - same "Columns" menu gesture/placement as CCVA's own
  // Display Data table (ccva-results.component.ts), generalized to a list
  // rather than one fixed checkbox since there are several toggleable
  // columns here. VA ID and View are never in this list - always shown.
  columnsMenuOpen = false;
  // Interviewer Name and Algorithm default off (Table 1) - least useful
  // for most day-to-day reading of this table, still available in the
  // Columns menu. The trailing 4 columns depend on `mode` - set in
  // ngOnInit() for the same reason filterByChoices/groupByChoices are.
  // Unlike Algorithm, the DQA columns default ON - there's no equivalent
  // "rarely useful" column among them, they're the whole point of Table 2.
  columnsConfig: { key: string; visible: boolean }[] = [
    { key: 'region', visible: true },
    { key: 'district', visible: true },
    { key: 'interviewDay', visible: true },
    { key: 'interviewerName', visible: false },
    { key: 'questionnaireType', visible: true },
    { key: 'gender', visible: true },
  ];

  // Table 2's score columns show the quality-tier badge (Excellent/Good/
  // Critical, Too Short/Normal/Too Long) by default, not the raw percentage/
  // minutes - the badge is what's actionable at a glance; the exact number
  // is still available, just off by default, toggled on here.
  showDqaPercentages = false;

  constructor(
    private listRecordsService: ListRecordsService,
    public dialog: MatDialog,
    private filterService: FilterService,
    private settingConfigService: SettingConfigService,
    private generalDqaService: GeneralDqaService,
    private dqaThresholdService: DqaThresholdService,
    private route: ActivatedRoute
  ) {
    this.filterService = inject(FilterService);
    this.setupEffect();
  }
  setupEffect() {
    effect(() => {
      this.filterData = this.filterService.filterData();
      this.loadForCurrentView();
    });
  }

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] === 'dqa' ? 'dqa' : 'cause';
    this.setupModeSpecificChoices();
    this.loadSettingsLabels();
    this.loadCcvaFilterOptions();
    this.loadForCurrentView();
    if (this.mode === 'dqa') {
      this.loadDqaAnalyticsStatus();
    }
  }

  // Builds the Filter By/Group By dimensions and trailing table columns
  // for the active mode - Broad/Major/Specific Cause for Table 1 ('cause'),
  // RRS/ICS/ICI/AID for Table 2 ('dqa'). Gender/Age Group are shared by
  // both (first 7 columns + these 2 dimensions are identical between the
  // two tables, per the feature's own design).
  private setupModeSpecificChoices(): void {
    // Gender/Age Group trail the mode's own "extra" dimensions, same
    // ordering Table 1 already shipped with (ccvaCauseBroad/Major/
    // Specific, then gender, then age_group).
    const genderAndAgeGroup: { value: string; label: string; title?: string }[] = [
      { value: 'gender', label: 'Gender' },
      { value: 'age_group', label: 'Age Group' },
    ];
    if (this.mode === 'dqa') {
      this.filterByChoices = [
        { value: 'none', label: 'None' },
        { value: 'dqaRrs', label: 'RRS', title: 'Response Rate Score' },
        { value: 'dqaIcs', label: 'ICS', title: 'Internal Consistency Score' },
        { value: 'dqaIci', label: 'ICI', title: 'Interviewer Consistency Index' },
        { value: 'dqaAid', label: 'AID', title: 'Average Interview Duration' },
        ...genderAndAgeGroup,
      ];
      this.columnsConfig = [
        ...this.columnsConfig,
        { key: 'dqaRrs', visible: true },
        { key: 'dqaIcs', visible: true },
        { key: 'dqaIci', visible: true },
        { key: 'dqaAid', visible: true },
      ];
    } else {
      this.filterByChoices = [
        { value: 'none', label: 'None' },
        { value: 'ccvaCauseBroad', label: 'Broad Category' },
        { value: 'ccvaCauseMajor', label: 'Major Category' },
        { value: 'ccvaCauseSpecific', label: 'Specific Cause' },
        ...genderAndAgeGroup,
      ];
      this.columnsConfig = [
        ...this.columnsConfig,
        { key: 'ccvaCauseBroad', visible: true },
        { key: 'ccvaCauseMajor', visible: true },
        { key: 'ccvaCauseSpecific', visible: true },
        { key: 'ccvaAlgorithm', visible: false },
      ];
    }
    this.groupByChoices = this.filterByChoices;
  }

  // Table 2 only - checks whether the DQA analytics batch job has ever
  // completed a run (General DQA's own snapshot endpoint - there's no
  // separate "has it run" flag, `status`/`computed_at` null means never).
  // A `'running'` run in progress is treated the same as "not ready yet"
  // here - no polling, since the banner just needs to say "try again
  // shortly", the running job's own progress UI already lives on General
  // DQA.
  private loadDqaAnalyticsStatus(): void {
    this.generalDqaService.getAnalyticsSnapshot().subscribe({
      next: (res) => {
        this.dqaAnalyticsStatus = res?.data?.status ?? null;
      },
      error: () => {
        this.dqaAnalyticsStatus = null;
      },
    });
  }

  // Shown above the table/chart/map when Table 2's scores aren't
  // populated yet - true once we positively know the batch job hasn't
  // completed (not while the check is still in flight, i.e. status still
  // null).
  get showDqaNotRunBanner(): boolean {
    return this.mode === 'dqa' && this.dqaAnalyticsStatus !== null && this.dqaAnalyticsStatus !== 'completed';
  }

  // Dispatches to whichever view is currently active - the Map (loadMapPoints),
  // the Group By summary (loadGroupedRecords, which Table/Pie/Bar all chart
  // from), or the individual-record table (loadRecords) - used by every
  // trigger all views should react to (search, Filter By/Value, the global
  // date/location filter). Plain sort/page changes stay on loadRecords()
  // directly since their own controls only exist on the individual table,
  // never visible while grouped or mapped.
  private loadForCurrentView(): void {
    if (this.vizType === 'map') {
      this.loadMapPoints();
      return;
    }
    if (this.groupBy !== 'none') {
      this.loadGroupedRecords();
      return;
    }
    this.loadRecords();
  }

  onGroupByChange(value: string): void {
    if (value === this.groupBy) return;
    this.groupBy = value;
    // Pie/Bar can't render without something to aggregate - fall back to
    // Table rather than leaving a chart visualizing stale data.
    if (this.groupBy === 'none' && (this.vizType === 'pie' || this.vizType === 'bar')) {
      this.vizType = 'table';
    }
    // Reset to a sensible default (largest groups first) each time the
    // grouping itself changes - the previous sort (e.g. a column from the
    // individual table) likely doesn't apply to the new dimension's values.
    this.sortColumn = 'count';
    this.sortDirection = 'desc';
    this.pageNumber = 1;
    // Map points don't depend on groupBy (only their color-coding does,
    // handled reactively by app-va-record-map-view's own [groupBy] input) -
    // no need to refetch.
    if (this.vizType === 'map') return;
    this.loadForCurrentView();
  }

  // Shared by the viz switcher's Table/Pie/Bar/Map buttons.
  onVizTypeChange(vizType: VaRecordVizType): void {
    if (vizType === this.vizType) return;
    if ((vizType === 'pie' || vizType === 'bar') && this.groupBy === 'none') return;
    this.vizType = vizType;
    this.loadForCurrentView();
  }

  loadGroupedRecords(): void {
    this.isLoadingGrouped = true;
    this.listRecordsService
      .getGroupedRecords(
        this.groupBy,
        this.filterData.startDate,
        this.filterData.endDate,
        this.filterData.locations,
        this.searchBy,
        this.searchValue,
        this.filterBy !== 'none' ? this.filterBy : undefined,
        this.filterBy !== 'none' ? this.filterValue || undefined : undefined
      )
      .subscribe({
        next: (response: any) => {
          this.groupedData = response?.data ?? [];
          this.groupedTotal = response?.total ?? 0;
          this.error = response?.error ?? null;
          this.buildGroupChart();
        },
        error: () => {
          this.error = 'Failed to fetch grouped records';
        },
        complete: () => {
          this.isLoadingGrouped = false;
        },
      });
  }

  loadMapPoints(): void {
    this.isLoadingMap = true;
    this.listRecordsService
      .getTableMapPoints(
        this.filterData.startDate,
        this.filterData.endDate,
        this.filterData.locations,
        this.searchBy,
        this.searchValue,
        this.filterBy !== 'none' ? this.filterBy : undefined,
        this.filterBy !== 'none' ? this.filterValue || undefined : undefined
      )
      .subscribe({
        next: (response: any) => {
          this.mapPoints = response?.data ?? [];
          this.error = response?.error ?? null;
        },
        error: () => {
          this.error = 'Failed to fetch map points';
        },
        complete: () => {
          this.isLoadingMap = false;
        },
      });
  }

  percentageFor(row: { group: string; count: number }): string {
    return this.groupedTotal ? `${((row.count / this.groupedTotal) * 100).toFixed(1)}%` : '—';
  }

  // Group By summary table's first column header - "Broad Category" etc.,
  // same lookup-by-value convention as CCVA's own grouped table.
  labelFromChoices(choices: { value: string; label: string }[], value: string): string {
    return choices.find(c => c.value === value)?.label || value;
  }

  private buildGroupChart(): void {
    const colorMap = colorMapForValues(this.groupedData.map(r => r.group));
    this.groupChartLabels = this.groupedData.map(r => r.group);
    this.groupChartData = [
      {
        label: 'count',
        data: this.groupedData.map(r => r.count),
        backgroundColor: this.groupedData.map(r => colorForGroup(this.groupBy, r.group, colorMap)),
        borderWidth: 1,
      },
    ];
  }

  private chartTooltipLabel(context: any): string {
    const value = Number(context.raw) || 0;
    const total = (context.dataset.data as number[]).reduce((acc: number, v: any) => acc + Number(v), 0);
    const percentage = total ? ((value / total) * 100).toFixed(1) + '%' : '—';
    return `${context.label}: ${value.toLocaleString()} (${percentage})`;
  }

  get groupChartTitle(): string {
    return `Distribution by ${this.labelFromChoices(this.groupByChoices, this.groupBy)}`;
  }

  get groupChartSubtitle(): string {
    if (this.filterBy !== 'none' && this.filterValue) {
      return `${this.labelFromChoices(this.filterByChoices, this.filterBy)}: ${this.filterValue}`;
    }
    return 'All records';
  }

  private loadCcvaFilterOptions(): void {
    this.listRecordsService.getCcvaFilterOptions().subscribe({
      next: (response: any) => {
        this.ccvaFilterOptions = {
          broad: [], major: [], specific: [], gender: [], age_group: [],
          rrs: [], ics: [], ici: [], aid: [],
          ...(response?.data ?? {}),
        };
        this.updateFilterValueChoices();
      },
      error: () => {
        // Filter Value dropdown just stays empty - the rest of the table
        // (including the CCVA/DQA columns themselves) still works fine.
      },
    });
  }

  private updateFilterValueChoices(): void {
    const key = this.filterBy === 'ccvaCauseBroad' ? 'broad'
      : this.filterBy === 'ccvaCauseMajor' ? 'major'
      : this.filterBy === 'ccvaCauseSpecific' ? 'specific'
      : this.filterBy === 'gender' ? 'gender'
      : this.filterBy === 'age_group' ? 'age_group'
      : this.filterBy === 'dqaRrs' ? 'rrs'
      : this.filterBy === 'dqaIcs' ? 'ics'
      : this.filterBy === 'dqaIci' ? 'ici'
      : this.filterBy === 'dqaAid' ? 'aid'
      : null;
    const options = key ? this.ccvaFilterOptions[key] : [];
    // Gender comes back raw ("female"/"male", matching what's stored and
    // what the filter has to == against) - capitalized here only for the
    // label, same as the table's own Gender column already displays it.
    this.filterValueChoices = [
      { value: '', label: 'All' },
      ...options.map(value => ({
        value,
        label: key === 'gender' ? value.charAt(0).toUpperCase() + value.slice(1) : value,
      })),
    ];
  }

  onFilterByChange(value: string): void {
    this.filterBy = value;
    this.filterValue = '';
    this.updateFilterValueChoices();
    this.pageNumber = 1;
    this.loadForCurrentView();
  }

  onFilterValueChange(value: string): void {
    this.filterValue = value;
    this.pageNumber = 1;
    this.loadForCurrentView();
  }

  // Shared by every sortable column header in the table template - the
  // individual-record table AND the Group By summary table.
  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    // The grouped summary table (Group/Count) sorts the already-fetched
    // small array client-side - no need for a second round trip, same
    // reasoning as CCVA's own grouped table.
    if (this.groupBy !== 'none' && this.vizType === 'table') {
      this.sortGroupedDataClientSide();
      return;
    }
    this.loadRecords();
  }

  sortIcon(column: string): string {
    if (this.sortColumn !== column) return 'ph ph-arrows-down-up text-gray-300 text-xs';
    return this.sortDirection === 'asc'
      ? 'ph ph-arrow-up text-gray-600 text-xs'
      : 'ph ph-arrow-down text-gray-600 text-xs';
  }

  private sortGroupedDataClientSide(): void {
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.groupedData = [...this.groupedData].sort((a, b) =>
      this.sortColumn === 'count' ? (a.count - b.count) * dir : a.group.localeCompare(b.group) * dir
    );
  }

  loadSettingsLabels(): void {
    this.settingConfigService.getSettingsConfig().subscribe({
      next: (config) => {
        if (config?.system_configs) {
          this.locationLevel1Label = config.system_configs.admin_level1 || this.locationLevel1Label;
          this.locationLevel2Label = config.system_configs.admin_level2 || this.locationLevel2Label;
          this.refreshSearchByOptions();
        }
      },
      error: () => {
        // keep default labels if settings cannot be loaded
      },
    });
  }

  private refreshSearchByOptions(): void {
    this.searchByOptions = [
      { value: 'none', label: 'None' },
      { value: 'vaId', label: 'VA ID' },
      { value: 'instanceId', label: 'Instance ID' },
      { value: 'location_level1', label: this.locationLevel1Label },
      { value: 'location_level2', label: this.locationLevel2Label },
      { value: 'interviewer_name', label: 'Interviewer' },
    ];
  }

  // Switching to "None" clears the search outright (Search Value is
  // disabled while it's active - nothing meaningful to search by) and
  // reloads immediately, the same gesture the removed Clear button used
  // to perform. Switching to any real field just updates the dropdown -
  // Search stays a separate, explicit action for those, same as before.
  onSearchByChange(value: string): void {
    this.searchBy = value;
    if (value === 'none') {
      this.searchValue = '';
      this.pageNumber = 1;
      this.loadForCurrentView();
    }
  }

  loadRecords(): void {
    // debug: log when loadRecords invoked and current search state
    // eslint-disable-next-line no-console
    console.log('loadRecords called', { page: this.pageNumber, limit: this.limit, searchBy: this.searchBy, searchValue: this.searchValue });
    this.isLoading = true;
    this.listRecordsService
      .getRecordsData(
        this.pageNumber ? this.pageNumber : 1,
        this.limit,
        this.filterData.startDate,
        this.filterData.endDate,
        this.filterData.locations,
        this.searchBy,
        this.searchValue,
        this.sortColumn || undefined,
        this.sortDirection,
        this.filterBy !== 'none' ? this.filterBy : undefined,
        this.filterBy !== 'none' ? this.filterValue || undefined : undefined
      )
      .subscribe({
        next: (response) => {
          this.data = response.data;
          this.totalRecords = response.total;
          this.message = response.message;
          this.error = response.error;
        },
        error: (error) => {
          console.log('Error: ', error);
          this.error = 'Failed to fetch records';
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.loadForCurrentView();
  }

  onOpenVA(va: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "95vw";
    dialogConfig.height = "90vh";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      va: {
        ...va,
        instanceid: va?.vaId
      }
    }
    this.dialog.open(ViewVaComponent, dialogConfig)
  }

  // goToPreviousPage(): void {
  //   if (this.pageNumber > 1) {
  //     this.pageNumber--;
  //     this.loadRecords();
  //   }
  // }

  // goToNextPage(): void {
  //   if (this.pageNumber * this.limit < this.totalRecords) {
  //     this.pageNumber++;
  //     this.loadRecords();
  //   }
  // }

  // ── Column visibility ────────────────────────────────────────────────────

  // Region/District follow the configured admin-level names (same as the
  // search-by labels); the rest are static. Looked up by key rather than
  // stored as a frozen label on columnsConfig, so it stays correct if
  // locationLevel1Label/locationLevel2Label load (loadSettingsLabels) after
  // the menu has already rendered.
  columnLabel(key: string): string {
    switch (key) {
      case 'region': return this.locationLevel1Label;
      case 'district': return this.locationLevel2Label;
      case 'interviewDay': return 'Interview Day';
      case 'interviewerName': return 'Interviewer Name';
      case 'questionnaireType': return 'Questionnaire Type';
      case 'gender': return 'Gender';
      case 'ccvaCauseBroad': return 'Broad Category';
      case 'ccvaCauseMajor': return 'Major Category';
      case 'ccvaCauseSpecific': return 'Specific Cause';
      case 'ccvaAlgorithm': return 'Algorithm';
      case 'dqaRrs': return 'RRS';
      case 'dqaIcs': return 'ICS';
      case 'dqaIci': return 'ICI';
      case 'dqaAid': return 'AID';
      default: return key;
    }
  }

  // Table 2's score columns - "—" when this VA has no DQA run yet (null),
  // otherwise the raw score with its natural unit (AID is minutes, the
  // other 3 are percentages) - same raw-value convention as the map
  // popup's formatDqaScore(). Shown only when showDqaPercentages is on
  // (off by default - the badge from dqaBadge() below is the primary,
  // at-a-glance view).
  dqaScoreDisplay(value: number | null | undefined, field: 'dqaRrs' | 'dqaIcs' | 'dqaIci' | 'dqaAid'): string {
    if (value === null || value === undefined) return '—';
    return field === 'dqaAid' ? `${Math.round(value)} min` : `${value.toFixed(1)}%`;
  }

  // The quality-tier badge (Excellent/Good/Critical, or Too Short/Normal/
  // Too Long for AID) for one record's score - same admin-configured
  // thresholds/labels used everywhere else DQA scores are shown (General
  // DQA dashboard, the Data Map, this table's own map view). Null when
  // this VA has no score yet (DQA analytics not run) - the template shows
  // a gray "No Data" pill for that case, same convention as General DQA's
  // own per-record badge table.
  dqaBadge(value: number | null | undefined, field: 'dqaRrs' | 'dqaIcs' | 'dqaIci' | 'dqaAid'): StatusBadge | null {
    const v = value ?? null;
    switch (field) {
      case 'dqaRrs': return this.dqaThresholdService.classifyRrs(v);
      case 'dqaIcs': return this.dqaThresholdService.classifyIcs(v);
      case 'dqaIci': return this.dqaThresholdService.classifyIci(v);
      case 'dqaAid': return this.dqaThresholdService.classifyAid(v);
    }
  }

  toggleDqaPercentages(): void {
    this.showDqaPercentages = !this.showDqaPercentages;
  }

  isColumnVisible(key: string): boolean {
    return this.columnsConfig.find(c => c.key === key)?.visible ?? true;
  }

  toggleColumn(key: string): void {
    const col = this.columnsConfig.find(c => c.key === key);
    if (col) col.visible = !col.visible;
  }

  toggleColumnsMenu(): void {
    this.columnsMenuOpen = !this.columnsMenuOpen;
  }

  // Closes the Columns menu on any click outside it - same
  // composedPath()-based pattern (and the reason for it over
  // event.target.closest()) as ccva-results.component.ts's identical menu.
  @HostListener('document:click', ['$event'])
  onDocumentClickForColumnsMenu(event: MouseEvent): void {
    if (!this.columnsMenuOpen) return;
    const path = event.composedPath() as HTMLElement[];
    const inside = path.some(el => el?.classList?.contains?.('columns-menu-wrapper'));
    if (!inside) this.columnsMenuOpen = false;
  }

  // 3 always-visible columns (leading spacer, VA ID, View) plus whichever
  // of columnsConfig are currently toggled on - drives the colspan on the
  // "No record was found"/loading rows.
  get totalColumns(): number {
    return 3 + this.columnsConfig.filter(c => c.visible).length;
  }

  onPageChange(event: any) {
    this.pageNumber = this.pageNumber == 0 && this.pageNumber < event.pageIndex ? event.pageIndex + 1 : this.pageNumber !== 0 && this.pageNumber > event.pageIndex ? event.pageIndex - 1 : event.pageIndex;

    console.log("==> Page number changed: ", this.pageNumber);
    this.pageNumber = this.pageNumber! < 0 ? 0 : this.pageNumber;
    this.limit = Number(event?.pageSize);
    this.loadRecords();
  }
}
