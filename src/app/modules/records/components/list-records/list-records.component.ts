import {
  Component,
  effect,
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
      this.loadRecords();
    });
  }

  ngOnInit(): void {
    this.loadSettingsLabels();
    this.loadRecords();
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
        this.searchValue
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
    this.loadRecords();
  }

  onClearSearch(): void {
    this.searchValue = '';
    this.loadRecords();
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

  onPageChange(event: any) {
    this.pageNumber = this.pageNumber == 0 && this.pageNumber < event.pageIndex ? event.pageIndex + 1 : this.pageNumber !== 0 && this.pageNumber > event.pageIndex ? event.pageIndex - 1 : event.pageIndex;

    console.log("==> Page number changed: ", this.pageNumber);
    this.pageNumber = this.pageNumber! < 0 ? 0 : this.pageNumber;
    this.limit = Number(event?.pageSize);
    this.loadRecords();
  }
}
