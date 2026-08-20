import { Component, effect } from '@angular/core';
import { SubmissionsService } from '../../services/submissions/submissions.service';
import { MatDialog } from '@angular/material/dialog';
import { ResponseMainModel } from '../../../../shared/interface/main.interface';
import { SubmissionsDataModel } from '../../interface';
import { FilterService } from '../../../../shared/services/filter.service';
import { SettingConfigService } from '../../../settings/services/settings_configs.service';
import { settingsConfigData, FieldLabel } from '../../../settings/interface';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';
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
  // The raw ODK field names (e.g. "id10005r"), as opposed to `region`/
  // `district` above which are just the configured column *labels*
  // ("Region"/"District") - needed to look a value up in field_labels,
  // which is keyed by field_id.
  private regionField?: string;
  private districtField?: string;
  private fieldLabels: FieldLabel[] = [];
  // Rows exactly as the API returned them, before applying custom
  // field_labels - kept so relabels loaded later (see initial()) can be
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
    private snackBar: MatSnackBar
  ) {
    this.initial();
    // No separate initial loadRecords() call here - setupEffect()'s effect
    // fires once on registration with the current filter state, so this
    // would just be a redundant duplicate request racing the real one.
    this.setupEffect();
  }

  initial() {
    this.settingsConfigsService
      .getSettingsConfig(true)
      .subscribe((config: settingsConfigData | null) => {
        if (
          config &&
          Object.keys(config.odk_api_configs).length &&
          Object.keys(config.odk_api_configs).length &&
          Object.keys(config.field_mapping).length
        ) {
          this.region = config.system_configs.admin_level1;
          this.district = config.system_configs.admin_level2;
          this.regionField = config.field_mapping.location_level1;
          this.districtField = config.field_mapping.location_level2;
          this.fieldLabels = config.field_labels || [];
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

  // A raw ODK value (e.g. "Ilala_Municipal_Council") shown via its saved
  // custom label (e.g. "Ilala MC") if an admin has set one under Settings >
  // Configuration > Re-label Access Fields, else the raw value unchanged.
  private labelFor(field: string | undefined, value: string): string {
    if (!field || !value) return value;
    const saved = this.fieldLabels.find((fl: any) => fl?.field_id === field);
    return saved?.options?.hasOwnProperty(value) ? saved.options[value] : value;
  }

  private applyLabels(): void {
    this.dataSubmissions = this.rawDataSubmissions.map(record => ({
      ...record,
      region: this.labelFor(this.regionField, record.region),
      district: this.labelFor(this.districtField, record.district),
    }));
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
        this.filterData.date_type
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
