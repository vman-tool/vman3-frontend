import {
  Component,
  effect,
  HostListener,
  inject,
  OnInit,
  runInInjectionContext,
} from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ListRecordsService } from '../../services/list-records/list-records.service';
import { DataFilterComponent } from '../../../../shared/dialogs/filters/data-filter/data-filter/data-filter.component';
import { FilterService } from '../../../../shared/services/filter.service';
import { ViewVaComponent } from 'app/shared/dialogs/view-va/view-va.component';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';
@Component({
  standalone: false,
  selector: 'app-list-records',
  templateUrl: './list-records.component.html',
  styleUrls: ['./list-records.component.scss'],
})
export class ListRecordsComponent implements OnInit {
  title: string = 'VA Data';
  data: any[] = [];
  isLoading: boolean = false;
  searchBy: string = 'vaId';
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
  filterByChoices: { value: string; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'ccvaCauseBroad', label: 'Broad Category' },
    { value: 'ccvaCauseMajor', label: 'Major Category' },
    { value: 'ccvaCauseSpecific', label: 'Specific Cause' },
  ];
  filterValueChoices: { value: string; label: string }[] = [{ value: '', label: 'All' }];
  private ccvaFilterOptions: { broad: string[]; major: string[]; specific: string[] } = {
    broad: [], major: [], specific: [],
  };

  // Group By - same 3 fields as Filter By, aliased to the exact same array
  // so the two dropdowns' options never drift apart. When set, the
  // individual-record table is replaced by a Group/Count/Percentage
  // summary (same behavior as CCVA's own Display Data table's Group By),
  // honoring every other active filter (date range/location/search/
  // Filter By-Value) the same way the individual list does.
  groupBy = 'none';
  groupByChoices: { value: string; label: string }[] = this.filterByChoices;
  groupedData: { group: string; count: number }[] = [];
  groupedTotal = 0;
  isLoadingGrouped = false;

  // Column visibility - same "Columns" menu gesture/placement as CCVA's own
  // Display Data table (ccva-results.component.ts), generalized to a list
  // rather than one fixed checkbox since there are several toggleable
  // columns here. VA ID and View are never in this list - always shown.
  columnsMenuOpen = false;
  columnsConfig: { key: string; visible: boolean }[] = [
    { key: 'region', visible: true },
    { key: 'district', visible: true },
    { key: 'interviewDay', visible: true },
    { key: 'interviewerName', visible: true },
    { key: 'questionnaireType', visible: true },
    { key: 'gender', visible: true },
    { key: 'ccvaCauseBroad', visible: true },
    { key: 'ccvaCauseMajor', visible: true },
    { key: 'ccvaCauseSpecific', visible: true },
    { key: 'ccvaAlgorithm', visible: true },
  ];

  constructor(
    private listRecordsService: ListRecordsService,
    public dialog: MatDialog,
    private filterService: FilterService,
    private settingConfigService: SettingConfigService
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
    this.loadSettingsLabels();
    this.loadCcvaFilterOptions();
    this.loadForCurrentView();
  }

  // Dispatches to whichever view is currently active - the individual-
  // record table (loadRecords) or the Group By summary (loadGroupedRecords)
  // - used by every trigger that both views should react to (search,
  // Filter By/Value, the global date/location filter). Plain sort/page
  // changes stay on loadRecords() directly since their own controls only
  // exist on the individual table, never visible while grouped.
  private loadForCurrentView(): void {
    if (this.groupBy !== 'none') {
      this.loadGroupedRecords();
      return;
    }
    this.loadRecords();
  }

  onGroupByChange(value: string): void {
    this.groupBy = value;
    this.pageNumber = 1;
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
        },
        error: () => {
          this.error = 'Failed to fetch grouped records';
        },
        complete: () => {
          this.isLoadingGrouped = false;
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

  private loadCcvaFilterOptions(): void {
    this.listRecordsService.getCcvaFilterOptions().subscribe({
      next: (response: any) => {
        this.ccvaFilterOptions = { broad: [], major: [], specific: [], ...(response?.data ?? {}) };
        this.updateFilterValueChoices();
      },
      error: () => {
        // Filter Value dropdown just stays empty - the rest of the table
        // (including the 4 CCVA columns themselves) still works fine.
      },
    });
  }

  private updateFilterValueChoices(): void {
    const key = this.filterBy === 'ccvaCauseBroad' ? 'broad'
      : this.filterBy === 'ccvaCauseMajor' ? 'major'
      : this.filterBy === 'ccvaCauseSpecific' ? 'specific'
      : null;
    const options = key ? this.ccvaFilterOptions[key] : [];
    this.filterValueChoices = [{ value: '', label: 'All' }, ...options.map(value => ({ value, label: value }))];
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

  // Shared by every sortable column header in the table template.
  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.loadRecords();
  }

  sortIcon(column: string): string {
    if (this.sortColumn !== column) return 'ph ph-arrows-down-up text-gray-300 text-xs';
    return this.sortDirection === 'asc'
      ? 'ph ph-arrow-up text-gray-600 text-xs'
      : 'ph ph-arrow-down text-gray-600 text-xs';
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
      { value: 'vaId', label: 'VA ID' },
      { value: 'instanceId', label: 'Instance ID' },
      { value: 'location_level1', label: this.locationLevel1Label },
      { value: 'location_level2', label: this.locationLevel2Label },
      { value: 'interviewer_name', label: 'Interviewer' },
    ];
  }

  onSearchByChange(value: string): void {
    this.searchBy = value;
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

  onClearSearch(): void {
    this.searchValue = '';
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
      default: return key;
    }
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
