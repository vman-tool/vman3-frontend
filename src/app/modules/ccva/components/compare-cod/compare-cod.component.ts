import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { CcvaService } from '../../services/ccva.service';
import { AdminUnitLabelsService } from 'app/shared/services/admin-unit-labels/admin-unit-labels.service';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { settingsConfigData } from 'app/modules/settings/interface';
import { ViewVaComponent } from 'app/shared/dialogs/view-va/view-va.component';

interface CcvaCompareRow {
  va_id: string;
  locationLevel1: string | null;
  locationLevel2: string | null;
  locationLevel3: string | null;
  gender: string | null;
  age_group: string | null;
  cause1_algo1: string | null;
  cause1_probability_algo1: number | null;
  cause2_algo1: string | null;
  cause2_probability_algo1: number | null;
  cause1_algo2: string | null;
  cause1_probability_algo2: number | null;
  cause2_algo2: string | null;
  cause2_probability_algo2: number | null;
  cause1_agrees: boolean;
}

// Well above any realistic pair of CCVA runs' matched-record count - used
// only for "download the table" (same convention as ccva-results.component.ts).
const EXPORT_LIMIT = 200_000;

interface CcvaCompareFilterOptions {
  gender: string[];
  age_group: string[];
  cause1_algo1: string[];
  cause1_algo2: string[];
  matched_total: number;
  task1_total: number;
  task2_total: number;
}

const EMPTY_FILTER_OPTIONS: CcvaCompareFilterOptions = {
  gender: [],
  age_group: [],
  cause1_algo1: [],
  cause1_algo2: [],
  matched_total: 0,
  task1_total: 0,
  task2_total: 0,
};

// No Broad/Major Category here - see the module note above
// fetch_ccva_compare_results in ccva_data_services.py for why. "Cause
// Specific" needs a follow-up Algorithm choice (see filterAlgoChoices)
// since each run can carry a different Cause 1 for the same VA.
const FILTER_BY_CHOICES: { value: string; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'gender', label: 'Gender' },
  { value: 'age_group', label: 'Age Group' },
  { value: 'cause_specific', label: 'Cause Specific' },
  { value: 'agreement', label: 'Agreement' },
];

// Agreement's choices are fixed (not pulled from filterOptions, unlike every
// other Filter By field) - there are only ever these two outcomes.
const AGREEMENT_VALUE_CHOICES: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'disagreement', label: 'Disagreement' },
];

// Same convention as compare-ccva.component.ts's ALGO_LABELS.
const ALGO_LABELS: { [key: string]: string } = {
  VManML10: 'VMan ML 1.0',
  InterVA5: 'InterVA5',
};

// "Compare CoD": one row per VA id present in BOTH selected runs, with each
// algorithm's Cause 1/2 + probability shown side by side - lets an admin see
// exactly where two algorithms' cause-of-death assignments agree or differ.
// "Probability" (not "Likelihood") is used throughout, matching the
// terminology ccva-results.component.ts already settled on for the same
// underlying LIK1/LIK2 values.
@Component({
  standalone: false,
  selector: 'app-compare-cod',
  templateUrl: './compare-cod.component.html',
  styleUrl: './compare-cod.component.scss',
})
export class CompareCodComponent implements OnInit {
  taskId1 = '';
  taskId2 = '';
  algo1 = '';
  algo2 = '';

  data: CcvaCompareRow[] = [];
  isLoading = true;
  errorMessage = '';

  pageNumber = 1;
  limit = 10;
  totalRecords = 0;

  searchVaId = '';

  filterByChoices = FILTER_BY_CHOICES;
  filterBy = 'none';
  filterValue = '';
  // Which run's Cause 1 the "Cause Specific" Filter Value applies to.
  filterAlgo: '1' | '2' = '1';
  filterOptions: CcvaCompareFilterOptions = EMPTY_FILTER_OPTIONS;
  // A plain field, not a getter - see ccva-results.component.ts's
  // filterValueChoices comment for why (NG0103 with app-custom-dropdown).
  filterValueChoices: { value: string; label: string }[] = [{ value: '', label: 'All' }];

  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  // Probability columns (both algorithms, Cause 1 & 2) are hidden by
  // default - this table is primarily about which Cause was assigned, not
  // the confidence behind it. Cause 2 is a secondary prediction most
  // records don't need either. Location (Region/Zone/Woreda = Admin Level
  // 1/2/3) is hidden by default too - with two algorithms' causes already
  // on screen, it's the least central column set. All toggle independently
  // via Columns.
  showProbabilities = false;
  showCause2 = false;
  showLocation = false;
  columnsMenuOpen = false;

  downloadMenuOpen = false;
  isExporting = false;

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
    this.taskId1 = this.route.snapshot.paramMap.get('task_id_1') ?? '';
    this.taskId2 = this.route.snapshot.paramMap.get('task_id_2') ?? '';
    this.algo1 = this.route.snapshot.queryParamMap.get('algo1') ?? '';
    this.algo2 = this.route.snapshot.queryParamMap.get('algo2') ?? '';
    this.loadLocationLabels();
    this.loadFilterOptions();
    this.adminUnitLabelsService.load().subscribe();
    this.loadResults();
  }

  algoLabel(algorithm: string): string {
    return (algorithm && ALGO_LABELS[algorithm]) ?? algorithm ?? '—';
  }

  // "Cause 1: InterVA5" / "Cause 1: VMan ML 1.0" style headers, per the
  // user's requested terminology.
  get cause1HeaderAlgo1(): string { return `Cause 1: ${this.algoLabel(this.algo1)}`; }
  get cause1HeaderAlgo2(): string { return `Cause 1: ${this.algoLabel(this.algo2)}`; }
  get cause2HeaderAlgo1(): string { return `Cause 2: ${this.algoLabel(this.algo1)}`; }
  get cause2HeaderAlgo2(): string { return `Cause 2: ${this.algoLabel(this.algo2)}`; }

  // VMan ML never reports a Cause 2 probability (vman_ml_service.py always
  // writes LIK2 as null for it) - surfaced here so a blank cell under its
  // Cause 2 Probability column reads as expected behaviour, not a bug.
  get algo1NeverReportsCause2Probability(): boolean { return this.algo1 === 'VManML10'; }
  get algo2NeverReportsCause2Probability(): boolean { return this.algo2 === 'VManML10'; }

  get filterAlgoChoices(): { value: string; label: string }[] {
    return [
      { value: '1', label: this.algoLabel(this.algo1) },
      { value: '2', label: this.algoLabel(this.algo2) },
    ];
  }

  private loadFilterOptions(): void {
    if (!this.taskId1 || !this.taskId2) return;
    this.ccvaService.get_ccva_compare_filter_options(this.taskId1, this.taskId2).subscribe({
      next: (response: any) => {
        this.filterOptions = { ...EMPTY_FILTER_OPTIONS, ...(response?.data ?? {}) };
        this.updateFilterValueChoices();
      },
      error: () => {
        // Filter Value dropdown and the match-count banner just stay at
        // their empty defaults - VA ID search and the table still work.
      },
    });
  }

  get currentFilterValueOptions(): string[] {
    if (this.filterBy === 'gender') return this.filterOptions.gender;
    if (this.filterBy === 'age_group') return this.filterOptions.age_group;
    if (this.filterBy === 'cause_specific') {
      return this.filterAlgo === '1' ? this.filterOptions.cause1_algo1 : this.filterOptions.cause1_algo2;
    }
    return [];
  }

  private updateFilterValueChoices(): void {
    // Agreement's choices are fixed, not value lists pulled off filterOptions.
    if (this.filterBy === 'agreement') {
      this.filterValueChoices = AGREEMENT_VALUE_CHOICES;
      return;
    }
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
        }
      },
      error: () => {
        // keep the generic fallback labels
      },
    });
  }

  loadResults(): void {
    if (!this.taskId1 || !this.taskId2) {
      this.errorMessage = 'These two CCVA runs could not be identified.';
      this.isLoading = false;
      return;
    }
    this.isLoading = true;
    const appliedFilterBy = this.filterBy !== 'none' ? this.filterBy : undefined;
    const appliedFilterValue = appliedFilterBy ? this.filterValue || undefined : undefined;
    const appliedFilterAlgo = appliedFilterBy === 'cause_specific' ? this.filterAlgo : undefined;
    this.ccvaService
      .get_ccva_compare_results(
        this.taskId1,
        this.taskId2,
        this.pageNumber,
        this.limit,
        this.searchVaId.trim() || undefined,
        appliedFilterBy,
        appliedFilterValue,
        appliedFilterAlgo,
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
          this.errorMessage = 'Failed to load CCVA comparison results.';
          this.isLoading = false;
        },
      });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.loadResults();
  }

  onClearSearch(): void {
    this.searchVaId = '';
    this.filterBy = 'none';
    this.filterValue = '';
    this.filterAlgo = '1';
    this.updateFilterValueChoices();
    this.pageNumber = 1;
    this.loadResults();
  }

  onFilterByChange(value: string): void {
    if (value === this.filterBy) return;
    this.filterBy = value;
    this.filterValue = '';
    this.filterAlgo = '1';
    this.updateFilterValueChoices();
    this.pageNumber = 1;
    this.loadResults();
  }

  onFilterAlgoChange(value: string): void {
    if (value === this.filterAlgo) return;
    this.filterAlgo = value as '1' | '2';
    this.filterValue = '';
    this.updateFilterValueChoices();
    this.pageNumber = 1;
    this.loadResults();
  }

  onFilterValueChange(value: string): void {
    if (value === this.filterValue) return;
    this.filterValue = value;
    this.pageNumber = 1;
    this.loadResults();
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
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

  locationLabel(value: string | null | undefined): string {
    if (!value) return '—';
    return this.adminUnitLabelsService.friendlyLabel(value);
  }

  formatProbability(value: number | null | undefined): string {
    return value != null ? `${value}%` : '—';
  }

  get rangeStart(): number {
    return this.totalRecords === 0 ? 0 : (this.pageNumber - 1) * this.limit + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.pageNumber * this.limit, this.totalRecords);
  }

  get hasPrevious(): boolean { return this.pageNumber > 1; }
  get hasNext(): boolean { return this.pageNumber * this.limit < this.totalRecords; }

  /** 7 fixed columns (VA ID, Gender, Age Group, Cause 1 x2 algorithms,
   * Agreement, View), plus Region/Zone/Woreda x3 when toggled, plus Cause 1
   * Probability x2 when toggled, plus Cause 2 x2 (and its own Probability
   * x2) when toggled. */
  get totalColumns(): number {
    let total = 7;
    if (this.showLocation) total += 3;
    if (this.showProbabilities) total += 2;
    if (this.showCause2) total += this.showProbabilities ? 4 : 2;
    return total;
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

  toggleProbabilityColumns(): void {
    this.showProbabilities = !this.showProbabilities;
  }

  toggleCause2Column(): void {
    this.showCause2 = !this.showCause2;
  }

  toggleLocationColumns(): void {
    this.showLocation = !this.showLocation;
  }

  // Same ViewVaComponent dialog as ccva-results.component.ts's onView() and
  // list-records.component.ts's onOpenVA() - no task_id is passed since this
  // row isn't "owned" by either of the two runs being compared (both their
  // causes are already shown side by side in the table itself); the dialog
  // falls back to its default CCVA determination, same as the plain VA
  // Records list's View action.
  onView(row: CcvaCompareRow): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = '95vw';
    dialogConfig.height = '90vh';
    dialogConfig.panelClass = 'cdk-overlay-pane';
    dialogConfig.data = { va: row.va_id };
    this.dialog.open(ViewVaComponent, dialogConfig);
  }

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

  private async fetchExportRows(): Promise<Record<string, any>[]> {
    const appliedFilterBy = this.filterBy !== 'none' ? this.filterBy : undefined;
    const appliedFilterValue = appliedFilterBy ? this.filterValue || undefined : undefined;
    const appliedFilterAlgo = appliedFilterBy === 'cause_specific' ? this.filterAlgo : undefined;
    const response: any = await firstValueFrom(
      this.ccvaService.get_ccva_compare_results(
        this.taskId1,
        this.taskId2,
        1,
        EXPORT_LIMIT,
        this.searchVaId.trim() || undefined,
        appliedFilterBy,
        appliedFilterValue,
        appliedFilterAlgo,
        this.sortColumn || undefined,
        this.sortDirection
      )
    );
    const rows: CcvaCompareRow[] = response?.data ?? [];
    return rows.map(row => ({
      'VA ID': row.va_id,
      [this.regionLabel]: this.locationLabel(row.locationLevel1),
      [this.districtLabel]: this.locationLabel(row.locationLevel2),
      [this.wardLabel]: this.locationLabel(row.locationLevel3),
      Gender: row.gender || '—',
      'Age Group': row.age_group || '—',
      [this.cause1HeaderAlgo1]: row.cause1_algo1 || '—',
      [`${this.cause1HeaderAlgo1} Probability`]: this.formatProbability(row.cause1_probability_algo1),
      [this.cause1HeaderAlgo2]: row.cause1_algo2 || '—',
      [`${this.cause1HeaderAlgo2} Probability`]: this.formatProbability(row.cause1_probability_algo2),
      'Cause 1 Agreement': row.cause1_agrees ? 'Agree' : 'Differ',
      [this.cause2HeaderAlgo1]: row.cause2_algo1 || '—',
      [`${this.cause2HeaderAlgo1} Probability`]: this.formatProbability(row.cause2_probability_algo1),
      [this.cause2HeaderAlgo2]: row.cause2_algo2 || '—',
      [`${this.cause2HeaderAlgo2} Probability`]: this.formatProbability(row.cause2_probability_algo2),
    }));
  }

  async onDownload(format: 'xlsx' | 'csv' = 'xlsx'): Promise<void> {
    if (!this.taskId1 || !this.taskId2 || this.isExporting) return;
    this.isExporting = true;
    this.downloadMenuOpen = false;
    try {
      const rows = await this.fetchExportRows();
      const fileName = `CCVA_Compare_CoD_${this.taskId1}_vs_${this.taskId2}`;
      if (format === 'csv') {
        this.ccvaService.exportToCsv(rows, fileName);
      } else {
        this.ccvaService.exportToExcel(rows, fileName);
      }
    } catch (error) {
      console.error('Failed to export CCVA comparison results', error);
      this.snackBar.open('Failed to export comparison results. Please try again.', 'Close', {
        horizontalPosition: 'end',
        verticalPosition: 'top',
        duration: 3000,
      });
    } finally {
      this.isExporting = false;
    }
  }
}
