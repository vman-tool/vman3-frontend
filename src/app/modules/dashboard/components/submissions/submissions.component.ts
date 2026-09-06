import { Component, ElementRef, HostListener, ViewChild, effect } from '@angular/core';
import { SubmissionsService } from '../../services/submissions/submissions.service';
import { MatDialog } from '@angular/material/dialog';
import { ResponseMainModel } from '../../../../shared/interface/main.interface';
import { SubmissionsDataModel } from '../../interface';
import { FilterService } from '../../../../shared/services/filter.service';
import { SettingConfigService } from '../../../settings/services/settings_configs.service';
import { settingsConfigData } from '../../../settings/interface';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';
import { AdminUnitLabelsService } from 'app/shared/services/admin-unit-labels/admin-unit-labels.service';
import { Subscription } from 'rxjs';

@Component({
  standalone: false,
  selector: 'app-submissions',
  templateUrl: './submissions.component.html',
  styleUrls: ['./submissions.component.scss'],
})
export class SubmissionsComponent {
  dataSubmissions: SubmissionsDataModel[] = [];
  pageNumber: number = 1;
  limit: number = 10;
  totalRecords: number | undefined;
  message: string = '';
  errorMessage: string | null = null;
  region: string | undefined;
  district: string | undefined;
  ward: string | undefined;
  // How many admin levels deep the table currently drills into: 1 (region
  // only) through 3 (region/district/ward). Sent to the backend so grouping
  // happens there, not just column visibility here.
  groupLevel: number = 2;
  // Plain fields, not getters: a getter returning a new array/object
  // literal on every template check makes *ngFor treat it as a brand new
  // list each change-detection pass (no trackBy) and re-render forever,
  // which Angular eventually stops as NG0103 (infinite change detection).
  groupLevelOptions: { value: string; label: string }[] = [
    { value: '1', label: 'Region' },
    { value: '2', label: 'District' },
    { value: '3', label: 'Ward' },
  ];
  colWidths: number[] = [11, 12, 6, 7, 9, 9, 9, 6, 6, 6, 6, 6, 7];
  // Rows exactly as the API returned them, before applying friendly admin-
  // unit labels - kept so relabels loaded later (see initial()) can be
  // re-applied without re-fetching.
  private rawDataSubmissions: SubmissionsDataModel[] = [];

  // ── Period filter (this table only - independent of the page-wide
  // <app-va-filters> date range) ──────────────────────────────────────────
  // When set to anything but 'all', overrides filterData's own start/end
  // date for this table's request only, so Submitted/Expected/Completeness/
  // First/Last/Coverage are all recomputed server-side for exactly that
  // period rather than just hiding rows client-side.
  periodFilter: 'all' | 'year' | 'month' | 'today' = 'all';
  periodFilterOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'year', label: 'This Year' },
    { value: 'month', label: 'This Month' },
    { value: 'today', label: 'Today' },
  ];

  onPeriodFilterChange(value: string): void {
    const next = value as typeof this.periodFilter;
    if (next === this.periodFilter) return;
    this.periodFilter = next;
    this.loadRecords();
  }

  // Local YYYY-MM-DD boundaries for the selected period, computed from the
  // browser's own clock - null (no override) when periodFilter is 'all'.
  private periodDateRange(): { start_date?: string; end_date?: string } {
    if (this.periodFilter === 'all') {
      return { start_date: this.filterData.start_date, end_date: this.filterData.end_date };
    }
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    let start: string;
    if (this.periodFilter === 'today') {
      start = end;
    } else if (this.periodFilter === 'month') {
      start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    } else {
      start = `${now.getFullYear()}-01-01`;
    }
    return { start_date: start, end_date: end };
  }

  // ── Download menu ───────────────────────────────────────────────────────

  @ViewChild('summaryTable') summaryTableRef?: ElementRef<HTMLTableElement>;
  downloadMenuOpen = false;
  isExporting = false;
  downloadFormats: { value: 'xlsx' | 'image' | 'pdf'; label: string }[] = [
    { value: 'xlsx', label: 'Excel (.xlsx)' },
    { value: 'image', label: 'Image (.png)' },
    { value: 'pdf', label: 'PDF' },
  ];

  toggleDownloadMenu(): void {
    this.downloadMenuOpen = !this.downloadMenuOpen;
  }

  // Closes the download menu on any click outside it. Uses
  // event.composedPath() rather than event.target.closest(...) - see the
  // identical pattern (and the reason for it) on the expected-deaths years
  // dropdown in configuration.component.ts.
  @HostListener('document:click', ['$event'])
  onDocumentClickForDownloadMenu(event: MouseEvent): void {
    if (!this.downloadMenuOpen) return;
    const path = event.composedPath() as HTMLElement[];
    const inside = path.some(el => el?.classList?.contains?.('download-menu-wrapper'));
    if (!inside) this.downloadMenuOpen = false;
  }

  async onDownload(format: 'xlsx' | 'image' | 'pdf'): Promise<void> {
    if (this.isExporting) return;
    this.downloadMenuOpen = false;

    if (format === 'xlsx') {
      this.listSubmissionsService.exportToExcel(this.sortedData, 'VA_Submissions');
      return;
    }

    const tableEl = this.summaryTableRef?.nativeElement;
    if (!tableEl) return;

    this.isExporting = true;
    try {
      if (format === 'image') {
        await this.listSubmissionsService.exportToImage(tableEl, 'VA_Submissions');
      } else {
        await this.listSubmissionsService.exportToPdf(tableEl, 'VA_Submissions');
      }
    } catch (error) {
      console.error('Export failed', error);
      this.snackBar.open('Export failed. Please try again.', 'Close', {
        horizontalPosition: 'end',
        verticalPosition: 'top',
        duration: 3000,
      });
    } finally {
      this.isExporting = false;
    }
  }

  sortColumn: keyof SubmissionsDataModel | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  isLoading: boolean = true;
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
  // Cancels whatever request is still in flight before starting a new one,
  // so an earlier (e.g. the initial unfiltered) request can never resolve
  // after a later one and clobber it with stale data - previously this
  // required clicking Apply/Reset twice, since only the second click's
  // response was reliably the last to arrive.
  private recordsSub?: Subscription;

  constructor(
    private listSubmissionsService: SubmissionsService,
    public dialog: MatDialog,
    private filterService: FilterService,
    private settingsConfigsService: SettingConfigService,
    private adminUnitLabelsService: AdminUnitLabelsService,
    private snackBar: MatSnackBar
  ) {
    this.initial();
    // No separate initial loadRecords() call here - setupEffect()'s effect
    // fires once on registration with the current filter state, so this
    // would just be a redundant duplicate request racing the real one.
    this.setupEffect();
    // The admin-unit label map loads independently of both settings and
    // records - re-apply once it's ready in case either already rendered
    // with raw values first.
    this.adminUnitLabelsService.load().subscribe(() => this.applyLabels());
  }

  initial() {
    this.settingsConfigsService
      .getSettingsConfig(true)
      .subscribe((config: settingsConfigData | null) => {
        // ODK API config is deliberately NOT required here - a deployment
        // that only ever uploads CSV/xForm data has no reason to fill in
        // that tab, and shouldn't be treated as "unconfigured" for it.
        if (
          config &&
          Object.keys(config.system_configs).length &&
          Object.keys(config.field_mapping).length
        ) {
          this.region = config.system_configs.admin_level1;
          this.district = config.system_configs.admin_level2;
          this.ward = config.system_configs.admin_level3;
          this.refreshGroupLevelOptions();
          // Settings can load after records have already rendered with raw
          // values (these two fetches race) - re-apply labels to whatever
          // is already loaded rather than waiting for the next refresh.
          this.applyLabels();
        } else {
          this.snackBar.open(
            'Please configure the system settings first!',
            'Close',
            {
              horizontalPosition: 'end',
              verticalPosition: 'top',
              duration: 3000,
            }
          );
        }
      });
  }

  // A raw ODK value (e.g. "Ilala_Municipal_Council") shown via its friendly
  // name from the expected_deaths admin hierarchy (Settings > Configuration
  // > Data Dictionary > Expected Number of Deaths) if it's one of that
  // hierarchy's units, else the raw value unchanged.
  private labelFor(value: string): string {
    if (!value) return value;
    return this.adminUnitLabelsService.friendlyLabel(value);
  }

  private applyLabels(): void {
    this.dataSubmissions = this.rawDataSubmissions.map(record => ({
      ...record,
      region: this.labelFor(record.region),
      district: record.district ? this.labelFor(record.district) : record.district,
      ward: record.ward ? this.labelFor(record.ward) : record.ward,
    }));
  }

  // ── Group-by level ─────────────────────────────────────────────────────────

  private refreshGroupLevelOptions(): void {
    this.groupLevelOptions = [
      { value: '1', label: this.region ?? 'Region' },
      { value: '2', label: this.district ?? 'District' },
      { value: '3', label: this.ward ?? 'Ward' },
    ];
  }

  onGroupLevelChange(value: string): void {
    const level = Number(value);
    if (!level || level === this.groupLevel) return;
    this.groupLevel = level;
    this.colWidths = this.widthsForLevel(level);
    this.loadRecords();
  }

  /** <colgroup> widths (%), sized so the table always fills 100% regardless
   * of how many location columns are currently shown. */
  private widthsForLevel(level: number): number[] {
    if (level === 1) return [23, 6, 7, 9, 9, 9, 6, 6, 6, 6, 6, 7];
    if (level === 3) return [8, 8, 7, 6, 7, 9, 9, 9, 6, 6, 6, 6, 6, 7];
    return [11, 12, 6, 7, 9, 9, 9, 6, 6, 6, 6, 6, 7];
  }

  /** Total column count: 11 fixed metric columns (submitted, expected,
   * completeness, first, last, coverage, adults, children, neonates, male,
   * female) plus one per admin level shown. */
  get totalColumns(): number {
    return 11 + this.groupLevel;
  }

  setupEffect() {
    effect(() => {
      this.filterData = this.filterService.filterData();
      this.loadRecords();
    });
  }

  loadRecords(): void {
    this.isLoading = true;
    this.recordsSub?.unsubscribe();
    const { start_date, end_date } = this.periodDateRange();
    this.recordsSub = this.listSubmissionsService
      .getsubmissionsData(
        this.pageNumber,
        this.limit,
        start_date,
        end_date,
        this.filterData.locations,
        this.filterData.date_type,
        this.groupLevel
      )
      .subscribe({
        next: (response: ResponseMainModel<any>) => {
          this.rawDataSubmissions = (response.data as SubmissionsDataModel[]) || [];
          this.applyLabels();
          this.totalRecords = response.total;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.message;
          this.isLoading = false;
        },
      });
  }

  // ── Sorting ────────────────────────────────────────────────────────────────

  get sortedData(): SubmissionsDataModel[] {
    if (!this.sortColumn || !this.dataSubmissions?.length) return this.dataSubmissions ?? [];
    const col = this.sortColumn;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return [...this.dataSubmissions].sort((a, b) => {
      const av = a[col], bv = b[col];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }

  onSort(col: keyof SubmissionsDataModel): void {
    if (this.sortColumn === col) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = col;
      this.sortDirection = 'asc';
    }
  }

  sortIcon(col: keyof SubmissionsDataModel): string {
    if (this.sortColumn !== col) return 'ph ph-arrows-down-up text-gray-300 text-xs';
    return this.sortDirection === 'asc'
      ? 'ph ph-arrow-up text-gray-600 text-xs'
      : 'ph ph-arrow-down text-gray-600 text-xs';
  }

  // ── Totals ─────────────────────────────────────────────────────────────────

  getTotalCount(): number {
    return this.dataSubmissions?.reduce((acc, record) => acc + record.count, 0);
  }

  getTotalAdults(): number {
    return this.dataSubmissions?.reduce((acc, record) => acc + record.adults, 0);
  }

  getTotalChildren(): number {
    return this.dataSubmissions?.reduce((acc, record) => acc + record.children, 0);
  }

  getTotalNeonates(): number {
    return this.dataSubmissions?.reduce((acc, record) => acc + record.neonates, 0);
  }

  getTotalMale(): number {
    return this.dataSubmissions?.reduce((acc, record) => acc + record.male, 0);
  }

  getTotalFemale(): number {
    return this.dataSubmissions?.reduce((acc, record) => acc + record.female, 0);
  }

  // Sum of expected across rows that have it - rows with no matching
  // admin unit (expected === null) are excluded rather than treated as 0,
  // so a handful of unmapped rows don't understate the total. Rounded to a
  // whole number, like each row's own expected value - only completeness
  // (a ratio) needs decimal precision.
  getTotalExpected(): number | null {
    const withExpected = this.dataSubmissions?.filter(record => record.expected != null) ?? [];
    if (!withExpected.length) return null;
    const total = withExpected.reduce((acc, record) => acc + (record.expected ?? 0), 0);
    return Math.round(total);
  }

  // Overall completeness = total submitted / total expected * 100, not an
  // average of each row's own percentage - avoids over-weighting small
  // admin units with few expected deaths. Rounded to 2 decimal places.
  getTotalCompleteness(): number | null {
    const totalExpected = this.getTotalExpected();
    if (!totalExpected) return null;
    return Math.round((this.getTotalCount() / totalExpected) * 10000) / 100;
  }

  // Backend dates may be a bare YYYY-MM-DD or a full ISO datetime -
  // only the date portion is ever shown.
  formatDate(value: string | null | undefined): string {
    return value ? value.slice(0, 10) : '';
  }
}
