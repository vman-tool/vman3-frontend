import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { CcvaService } from '../../services/ccva.service';
import { AdminUnitLabelsService } from 'app/shared/services/admin-unit-labels/admin-unit-labels.service';
import { ViewVaComponent } from 'app/shared/dialogs/view-va/view-va.component';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { settingsConfigData } from 'app/modules/settings/interface';

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
    this.loadResults();
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
        }
      },
      error: () => {
        // keep the generic fallback labels
      },
    });
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
    this.loadResults();
  }

  onClearSearch(): void {
    this.searchVaId = '';
    this.filterBy = 'none';
    this.filterValue = '';
    this.updateFilterValueChoices();
    this.pageNumber = 1;
    this.loadResults();
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
    dialogConfig.data = { va: row.va_id };
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

  async onDownload(): Promise<void> {
    if (!this.taskId || this.isExporting) return;
    this.isExporting = true;
    try {
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
      const exportRows = rows.map(row => ({
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
      this.ccvaService.exportToExcel(exportRows, `CCVA_Results_${this.taskId}`);
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
}
