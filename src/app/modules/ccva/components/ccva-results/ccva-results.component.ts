import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ChartDataset, ChartOptions } from 'chart.js';
import { CcvaService } from '../../services/ccva.service';
import { AdminUnitLabelsService } from 'app/shared/services/admin-unit-labels/admin-unit-labels.service';
import { ViewVaComponent } from 'app/shared/dialogs/view-va/view-va.component';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { settingsConfigData } from 'app/modules/settings/interface';
import { CcvaMapPoint } from '../ccva-map-view/ccva-map-view.component';
import { colorForGroup, colorMapForValues } from '../../utils/ccva-group-colors';

interface CcvaResultRow {
  va_id: string;
  locationLevel1: string | null;
  locationLevel2: string | null;
  locationLevel3: string | null;
  gender: string | null;
  age_group: string | null;
  cause1: string | null;
  cause1_probability: number | null;
  cause1_major: string | null;
  cause1_broad: string | null;
  cause2: string | null;
  cause2_probability: number | null;
}

// Well above any realistic single CCVA run's record count - used only for
// "download the table", which fetches everything matching the current
// search in one request rather than paging through it.
const EXPORT_LIMIT = 200_000;

interface CcvaFilterOptions {
  gender: string[];
  age_group: string[];
  broad: string[];
  major: string[];
}

const EMPTY_FILTER_OPTIONS: CcvaFilterOptions = { gender: [], age_group: [], broad: [], major: [] };

// "None" always leads the list, so clearing the filter (or the initial
// state) shows every record - per the user's explicit requirement.
const FILTER_BY_CHOICES: { value: string; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'gender', label: 'Gender' },
  { value: 'age_group', label: 'Age Group' },
  { value: 'broad', label: 'Broad Category' },
  { value: 'major', label: 'Major Category' },
];

interface CcvaGroupedRow {
  group: string;
  count: number;
}

type CcvaVizType = 'table' | 'pie' | 'bar' | 'map';

// Group By choices whose value is one of the plain admin-level fields -
// their labels are the configured Region/District/Ward names, rebuilt once
// those load (see updateGroupByChoices()).
const LOCATION_GROUP_BY_VALUES = ['region', 'district', 'ward'];

// Same server-side pagination/search shape as list-records.component.ts,
// with sortable column headers copied from the VA Data Submission Summary
// table's onSort()/sortIcon() pattern (submissions.component.ts).
@Component({
  standalone: false,
  selector: 'app-ccva-results',
  templateUrl: './ccva-results.component.html',
  styleUrl: './ccva-results.component.scss',
})
export class CcvaResultsComponent implements OnInit {
  taskId = '';
  data: CcvaResultRow[] = [];
  isLoading = true;
  errorMessage = '';

  pageNumber = 1;
  limit = 10;
  totalRecords = 0;

  searchVaId = '';

  filterByChoices = FILTER_BY_CHOICES;
  filterBy = 'none';
  filterValue = '';
  filterOptions: CcvaFilterOptions = EMPTY_FILTER_OPTIONS;
  // A plain field, recomputed only when filterBy/filterOptions actually
  // change (updateFilterValueChoices()) - NOT a getter. CustomDropdownComponent
  // binds [options] straight through to *ngFor; a getter returning a fresh
  // array literal on every access looks like a perpetually-changing binding
  // to Angular's change detector and trips NG0103 ("infinite change
  // detection"), discovered live while verifying this feature.
  filterValueChoices: { value: string; label: string }[] = [{ value: '', label: 'All' }];

  // Group By - aggregates the (already searched/filtered) record set into
  // counts per group value, driving the Table(grouped)/Pie/Bar/Map views
  // below. A plain field for the same NG0103 reason as filterValueChoices.
  groupByChoices: { value: string; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'region', label: 'Location Level 1' },
    { value: 'district', label: 'Location Level 2' },
    { value: 'ward', label: 'Location Level 3' },
    { value: 'gender', label: 'Gender' },
    { value: 'age_group', label: 'Age Group' },
    { value: 'broad', label: 'Broad Category' },
    { value: 'major', label: 'Major Category' },
  ];
  groupBy = 'none';
  groupedData: CcvaGroupedRow[] = [];
  groupedTotal = 0;
  isLoadingGrouped = false;

  vizType: CcvaVizType = 'table';
  downloadMenuOpen = false;

  mapPoints: CcvaMapPoint[] = [];
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

  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  // Cause 2 / Cause 2 Probability are hidden by default (most records only
  // have one confident cause) - toggled via the Columns menu.
  showCause2 = false;
  columnsMenuOpen = false;
  isExporting = false;

  // Configured admin-level names (Region/District/Ward), falling back to
  // generic labels until settings load - same convention as
  // list-records.component.ts's locationLevel1Label/locationLevel2Label.
  regionLabel = 'Location Level 1';
  districtLabel = 'Location Level 2';
  wardLabel = 'Location Level 3';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ccvaService: CcvaService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private adminUnitLabelsService: AdminUnitLabelsService,
    private settingConfigService: SettingConfigService
  ) {}

  ngOnInit(): void {
    this.taskId = this.route.snapshot.paramMap.get('task_id') ?? '';
    this.loadLocationLabels();
    this.loadFilterOptions();
    this.adminUnitLabelsService.load().subscribe();
    this.loadForCurrentView();
  }

  private loadFilterOptions(): void {
    if (!this.taskId) return;
    this.ccvaService.get_ccva_filter_options(this.taskId).subscribe({
      next: (response: any) => {
        this.filterOptions = { ...EMPTY_FILTER_OPTIONS, ...(response?.data ?? {}) };
        this.updateFilterValueChoices();
      },
      error: () => {
        // Filter Value dropdown just stays empty - VA ID search and the
        // rest of the table still work fine without it.
      },
    });
  }

  // The Filter Value dropdown's options for whichever field Filter By is
  // currently set to; empty while on None, since there's nothing to choose
  // from yet.
  get currentFilterValueOptions(): string[] {
    return this.filterBy !== 'none' ? this.filterOptions[this.filterBy as keyof CcvaFilterOptions] ?? [] : [];
  }

  private updateFilterValueChoices(): void {
    this.filterValueChoices = [
      { value: '', label: 'All' },
      ...this.currentFilterValueOptions.map(value => ({ value, label: value })),
    ];
  }

  private loadLocationLabels(): void {
    this.settingConfigService.getSettingsConfig(true).subscribe({
      next: (config: settingsConfigData | null) => {
        if (config?.system_configs) {
          this.regionLabel = config.system_configs.admin_level1 || this.regionLabel;
          this.districtLabel = config.system_configs.admin_level2 || this.districtLabel;
          this.wardLabel = config.system_configs.admin_level3 || this.wardLabel;
          this.updateGroupByChoices();
        }
      },
      error: () => {
        // keep the generic fallback labels
      },
    });
  }

  // Group By's Region/District/Ward labels follow the configured admin
  // level names, same as the table's own column headers - a plain field
  // rebuild (not a getter) for the same NG0103 reason as filterValueChoices.
  private updateGroupByChoices(): void {
    const labelFor: Record<string, string> = { region: this.regionLabel, district: this.districtLabel, ward: this.wardLabel };
    this.groupByChoices = this.groupByChoices.map(choice =>
      LOCATION_GROUP_BY_VALUES.includes(choice.value) ? { value: choice.value, label: labelFor[choice.value] } : choice
    );
  }

  // Public - used both internally and from the grouped table's column
  // header in the template (strictTemplates forbids calling a private
  // member from a template).
  labelFromChoices(choices: { value: string; label: string }[], value: string): string {
    return choices.find(c => c.value === value)?.label || value;
  }

  loadResults(): void {
    if (!this.taskId) {
      this.errorMessage = 'This CCVA run could not be identified.';
      this.isLoading = false;
      return;
    }
    this.isLoading = true;
    const appliedFilterBy = this.filterBy !== 'none' ? this.filterBy : undefined;
    const appliedFilterValue = appliedFilterBy ? this.filterValue || undefined : undefined;
    this.ccvaService
      .get_ccva_individual_results(
        this.taskId,
        this.pageNumber,
        this.limit,
        this.searchVaId.trim() || undefined,
        appliedFilterBy,
        appliedFilterValue,
        this.sortColumn || undefined,
        this.sortDirection
      )
      .subscribe({
        next: (response: any) => {
          this.data = response?.data ?? [];
          this.totalRecords = response?.total ?? 0;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load CCVA results.';
          this.isLoading = false;
        },
      });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.loadForCurrentView();
  }

  onClearSearch(): void {
    this.searchVaId = '';
    this.filterBy = 'none';
    this.filterValue = '';
    this.updateFilterValueChoices();
    this.pageNumber = 1;
    this.loadForCurrentView();
  }

  // Selecting a new Filter By field starts that field's value fresh (its
  // Filter Value options differ), and reapplies immediately - a dropdown
  // selection is already an explicit action, unlike the free-text VA ID box.
  onFilterByChange(value: string): void {
    if (value === this.filterBy) return;
    this.filterBy = value;
    this.filterValue = '';
    this.updateFilterValueChoices();
    this.pageNumber = 1;
    this.loadForCurrentView();
  }

  onFilterValueChange(value: string): void {
    if (value === this.filterValue) return;
    this.filterValue = value;
    this.pageNumber = 1;
    this.loadForCurrentView();
  }

  // ── Group By / View switcher ─────────────────────────────────────────────

  onGroupByChange(value: string): void {
    if (value === this.groupBy) return;
    this.groupBy = value;
    // Pie/Bar can't render without something to aggregate - fall back to
    // Table rather than leaving a chart visualizing stale data.
    if (this.groupBy === 'none' && (this.vizType === 'pie' || this.vizType === 'bar')) {
      this.vizType = 'table';
    }
    // Reset to a sensible default (largest groups first) each time the
    // grouping itself changes - the previous sort likely doesn't apply to
    // the new dimension's values.
    this.sortColumn = 'count';
    this.sortDirection = 'desc';
    this.pageNumber = 1;
    // Map points don't depend on groupBy (only their color-coding does,
    // handled reactively by ccva-map-view's own [groupBy] input) - no need
    // to refetch.
    if (this.vizType === 'map') return;
    this.loadForCurrentView();
  }

  onVizTypeChange(vizType: CcvaVizType): void {
    if (vizType === this.vizType) return;
    if ((vizType === 'pie' || vizType === 'bar') && this.groupBy === 'none') return;
    this.vizType = vizType;
    this.downloadMenuOpen = false;
    this.loadForCurrentView();
  }

  // Routes to whichever fetch the current groupBy/vizType combination
  // needs - Search/Filter/Clear/Group By/View all funnel through this so
  // every control stays correct no matter which view is active.
  private loadForCurrentView(): void {
    if (this.vizType === 'map') {
      this.loadMapPoints();
      return;
    }
    if (this.groupBy !== 'none') {
      this.loadGroupedResults();
      return;
    }
    this.loadResults();
  }

  loadGroupedResults(): void {
    if (!this.taskId) {
      this.errorMessage = 'This CCVA run could not be identified.';
      this.isLoadingGrouped = false;
      return;
    }
    this.isLoadingGrouped = true;
    const appliedFilterBy = this.filterBy !== 'none' ? this.filterBy : undefined;
    const appliedFilterValue = appliedFilterBy ? this.filterValue || undefined : undefined;
    this.ccvaService
      .get_ccva_grouped_results(this.taskId, this.groupBy, this.searchVaId.trim() || undefined, appliedFilterBy, appliedFilterValue)
      .subscribe({
        next: (response: any) => {
          this.groupedData = response?.data ?? [];
          this.groupedTotal = response?.total ?? 0;
          this.sortGroupedDataClientSide();
          this.buildGroupChart();
          this.isLoadingGrouped = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load grouped CCVA results.';
          this.isLoadingGrouped = false;
        },
      });
  }

  loadMapPoints(): void {
    if (!this.taskId) {
      this.errorMessage = 'This CCVA run could not be identified.';
      this.isLoadingMap = false;
      return;
    }
    this.isLoadingMap = true;
    const appliedFilterBy = this.filterBy !== 'none' ? this.filterBy : undefined;
    const appliedFilterValue = appliedFilterBy ? this.filterValue || undefined : undefined;
    this.ccvaService
      .get_ccva_map_points(this.taskId, this.searchVaId.trim() || undefined, appliedFilterBy, appliedFilterValue)
      .subscribe({
        next: (response: any) => {
          this.mapPoints = response?.data ?? [];
          this.isLoadingMap = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load CCVA map points.';
          this.isLoadingMap = false;
        },
      });
  }

  // A grouped row's raw `group` value shown with the same friendly-name /
  // capitalization treatment the ungrouped table already gives that field.
  groupLabel(row: CcvaGroupedRow): string {
    if (LOCATION_GROUP_BY_VALUES.includes(this.groupBy)) {
      return this.locationLabel(row.group);
    }
    if ((this.groupBy === 'gender' || this.groupBy === 'age_group') && row.group) {
      return row.group.charAt(0).toUpperCase() + row.group.slice(1);
    }
    return row.group || 'Unclassified';
  }

  percentageFor(row: CcvaGroupedRow): string {
    return this.groupedTotal ? `${((row.count / this.groupedTotal) * 100).toFixed(1)}%` : '—';
  }

  private sortGroupedDataClientSide(): void {
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.groupedData = [...this.groupedData].sort((a, b) =>
      this.sortColumn === 'count' ? (a.count - b.count) * dir : this.groupLabel(a).localeCompare(this.groupLabel(b)) * dir
    );
  }

  private buildGroupChart(): void {
    const colorMap = colorMapForValues(this.groupedData.map(r => r.group));
    this.groupChartLabels = this.groupedData.map(r => this.groupLabel(r));
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

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    // The grouped summary table (Group/Count) sorts the already-fetched
    // small array client-side - no need for a second round trip.
    if (this.groupBy !== 'none' && this.vizType === 'table') {
      this.sortGroupedDataClientSide();
      return;
    }
    this.pageNumber = 1;
    this.loadResults();
  }

  sortIcon(column: string): string {
    if (this.sortColumn !== column) return 'ph ph-arrows-down-up text-gray-300 text-xs';
    return this.sortDirection === 'asc'
      ? 'ph ph-arrow-up text-gray-600 text-xs'
      : 'ph ph-arrow-down text-gray-600 text-xs';
  }

  // A raw ODK value shown via its friendly name from the expected_deaths
  // admin hierarchy, same as submissions.component.ts's labelFor().
  locationLabel(value: string | null | undefined): string {
    if (!value) return '—';
    return this.adminUnitLabelsService.friendlyLabel(value);
  }

  formatProbability(value: number | null | undefined): string {
    return value != null ? `${value}%` : '—';
  }

  onView(row: CcvaResultRow): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = '95vw';
    dialogConfig.height = '90vh';
    dialogConfig.panelClass = 'cdk-overlay-pane';
    // task_id scopes the popup's CCVA cause to this specific run, not
    // whichever run happens to be marked default - see ViewVaComponent's
    // constructor and ListRecordsService.getCauseOfDeath for why.
    dialogConfig.data = { va: row.va_id, task_id: this.taskId };
    this.dialog.open(ViewVaComponent, dialogConfig);
  }

  get rangeStart(): number {
    return this.totalRecords === 0 ? 0 : (this.pageNumber - 1) * this.limit + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.pageNumber * this.limit, this.totalRecords);
  }

  get hasPrevious(): boolean {
    return this.pageNumber > 1;
  }

  get hasNext(): boolean {
    return this.pageNumber * this.limit < this.totalRecords;
  }

  /** Total column count: 11 fixed columns, plus Cause 2 and Cause 2
   * Probability when that pair is toggled visible. */
  get totalColumns(): number {
    return this.showCause2 ? 13 : 11;
  }

  goToPreviousPage(): void {
    if (this.hasPrevious) {
      this.pageNumber--;
      this.loadResults();
    }
  }

  goToNextPage(): void {
    if (this.hasNext) {
      this.pageNumber++;
      this.loadResults();
    }
  }

  onBack(): void {
    this.router.navigate(['/ccva']);
  }

  // ── Column visibility ────────────────────────────────────────────────────

  toggleColumnsMenu(): void {
    this.columnsMenuOpen = !this.columnsMenuOpen;
  }

  toggleCause2Column(): void {
    this.showCause2 = !this.showCause2;
  }

  // Closes the Columns menu on any click outside it. Uses
  // event.composedPath() rather than event.target.closest() - see the
  // identical pattern (and the reason for it) on the expected-deaths years
  // dropdown in configuration.component.ts.
  @HostListener('document:click', ['$event'])
  onDocumentClickForColumnsMenu(event: MouseEvent): void {
    if (!this.columnsMenuOpen) return;
    const path = event.composedPath() as HTMLElement[];
    const inside = path.some(el => el?.classList?.contains?.('columns-menu-wrapper'));
    if (!inside) this.columnsMenuOpen = false;
  }

  // ── Download ─────────────────────────────────────────────────────────────

  toggleDownloadMenu(): void {
    this.downloadMenuOpen = !this.downloadMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClickForDownloadMenu(event: MouseEvent): void {
    if (!this.downloadMenuOpen) return;
    const path = event.composedPath() as HTMLElement[];
    const inside = path.some(el => el?.classList?.contains?.('download-menu-wrapper'));
    if (!inside) this.downloadMenuOpen = false;
  }

  private async fetchIndividualExportRows(): Promise<Record<string, any>[]> {
    const appliedFilterBy = this.filterBy !== 'none' ? this.filterBy : undefined;
    const appliedFilterValue = appliedFilterBy ? this.filterValue || undefined : undefined;
    const response: any = await firstValueFrom(
      this.ccvaService.get_ccva_individual_results(
        this.taskId,
        1,
        EXPORT_LIMIT,
        this.searchVaId.trim() || undefined,
        appliedFilterBy,
        appliedFilterValue,
        this.sortColumn || undefined,
        this.sortDirection
      )
    );
    const rows: CcvaResultRow[] = response?.data ?? [];
    return rows.map(row => ({
      'VA ID': row.va_id,
      [this.regionLabel]: this.locationLabel(row.locationLevel1),
      [this.districtLabel]: this.locationLabel(row.locationLevel2),
      [this.wardLabel]: this.locationLabel(row.locationLevel3),
      Gender: row.gender || '—',
      'Age Group': row.age_group || '—',
      'Cause 1': row.cause1 || '—',
      'Cause 1 Probability': this.formatProbability(row.cause1_probability),
      'Broad Category': row.cause1_broad || '—',
      'Major Category': row.cause1_major || '—',
      'Cause 2': row.cause2 || '—',
      'Cause 2 Probability': this.formatProbability(row.cause2_probability),
    }));
  }

  // Exports the grouped summary (matching what's actually on screen) rather
  // than raw individual rows, when a Group By is active.
  private buildGroupedExportRows(): Record<string, any>[] {
    const groupLabel = this.labelFromChoices(this.groupByChoices, this.groupBy);
    return this.groupedData.map(row => ({
      [groupLabel]: this.groupLabel(row),
      Count: row.count,
      Percentage: this.percentageFor(row),
    }));
  }

  async onDownload(format: 'xlsx' | 'csv' = 'xlsx'): Promise<void> {
    if (!this.taskId || this.isExporting) return;
    this.isExporting = true;
    this.downloadMenuOpen = false;
    try {
      const grouped = this.groupBy !== 'none';
      const rows = grouped ? this.buildGroupedExportRows() : await this.fetchIndividualExportRows();
      const fileName = `CCVA_${grouped ? 'Grouped_' + this.groupBy : 'Results'}_${this.taskId}`;
      if (format === 'csv') {
        this.ccvaService.exportToCsv(rows, fileName);
      } else {
        this.ccvaService.exportToExcel(rows, fileName);
      }
    } catch (error) {
      console.error('Failed to export CCVA results', error);
      this.snackBar.open('Failed to export CCVA results. Please try again.', 'Close', {
        horizontalPosition: 'end',
        verticalPosition: 'top',
        duration: 3000,
      });
    } finally {
      this.isExporting = false;
    }
  }

  // Pie/Bar image export - same canvas.toDataURL('image/png') mechanism
  // already proven in ccva-graphs.component.ts's downloadChart().
  downloadChartImage(): void {
    this.downloadMenuOpen = false;
    const canvasEl = document.querySelector('#ccva-group-chart canvas') as HTMLCanvasElement | null;
    if (!canvasEl) return;
    const link = document.createElement('a');
    link.href = canvasEl.toDataURL('image/png');
    link.download = `CCVA_${this.groupBy}_${this.vizType}_${this.taskId}.png`;
    link.click();
  }
}
