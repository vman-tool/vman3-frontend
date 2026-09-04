import { Component, effect } from '@angular/core';
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
  colWidths: number[] = [16, 22, 8, 14, 8, 8, 9, 7, 8];
  // Rows exactly as the API returned them, before applying friendly admin-
  // unit labels - kept so relabels loaded later (see initial()) can be
  // re-applied without re-fetching.
  private rawDataSubmissions: SubmissionsDataModel[] = [];

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
    if (level === 1) return [26, 10, 20, 10, 10, 10, 7, 7];
    if (level === 3) return [14, 15, 13, 7, 13, 8, 8, 6, 6];
    return [16, 22, 8, 14, 8, 8, 9, 7, 8];
  }

  /** Total column count: 7 fixed metric columns plus one per admin level shown. */
  get totalColumns(): number {
    return 7 + this.groupLevel;
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
    this.recordsSub = this.listSubmissionsService
      .getsubmissionsData(
        this.pageNumber,
        this.limit,
        this.filterData.start_date,
        this.filterData.end_date,
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

  downloadRecords() {
    this.listSubmissionsService.exportToExcel(this.dataSubmissions, 'VA_Submissions');
  }
}
