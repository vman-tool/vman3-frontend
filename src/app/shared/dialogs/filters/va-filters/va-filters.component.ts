import { Component, EventEmitter, Input, OnInit } from '@angular/core';
import { FilterService } from '../../../services/filter.service';
import { LocationService } from '../../../services/location.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { SharedModule } from '../../../shared.module';
import { CustomDropdownComponent } from '../../../components/custom-dropdown/custom-dropdown.component';
import { UsersService } from 'app/modules/settings/services/users.service';
import { lastValueFrom, map } from 'rxjs';
import { FieldLabel, FieldMapping, settingsConfigData, SystemConfig } from 'app/modules/settings/interface';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { GenericIndexedDbService } from 'app/shared/services/indexedDB/generic-indexed-db.service';
import { OBJECTSTORE_VA_QUESTIONS } from 'app/shared/constants/indexedDB.constants';
@Component({
  selector: 'app-va-filters',
  standalone: true,

  imports: [
    FormsModule,
    CommonModule,
    SharedModule,
    FormsModule,
    CustomDropdownComponent,
  ],
  templateUrl: './va-filters.component.html',
  styleUrl: './va-filters.component.scss',
})
export class VaFiltersComponent implements OnInit {
  selectedDateType?: string = 'death_date';
  startDate?: Date;
  endDate?: Date;
  selectedLocation: string[] = [];
  allLocations: any[] = [];
  current_user?: any

  isLoading: boolean = true;
  resetSelection = new EventEmitter<void>();
  closeDropdown = new EventEmitter<void>();

  systemConfigData?: SystemConfig;
  fieldMappingData?: FieldMapping;
  fieldLabels: FieldLabel[] | undefined;
  selectedLocationType: any;
  constructor(
    private locationService: LocationService,
    private filterService: FilterService,
    private usersService: UsersService,
    private settingConfigService: SettingConfigService,
    private genericIndexedDbService: GenericIndexedDbService,
    private datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.resetFilterData();
    this.getUserAccessLimit();
    this.locationService.getLocations().subscribe({
      next: (locations) => {
        this.allLocations = locations.map((location: string) => ({
          key: location,
          value: location,
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to fetch locations:', error);
        this.isLoading = false;
      },
    });
  }

  async loadSystemConfigurations() {
    await lastValueFrom(
      this.settingConfigService.getSettingsConfig().pipe(map(() => {
        (data: settingsConfigData | null) => {
          if (!!data) {
            this.systemConfigData = data?.system_configs;
            this.fieldMappingData = data?.field_mapping;
            this.fieldLabels = data?.field_labels;
          }
        }
      }))
    )
  }
  resetFilterData() {
    // Notify filterService of the reset
    this.filterService.setFilterData({
      locations: [],
      start_date: undefined,
      end_date: undefined,
      date_type: undefined,
      ccva_graph_db_source: true,
    } as any);
  }

  async getUserAccessLimit() {
    this.loadSystemConfigurations();
    this.current_user = JSON.parse(localStorage.getItem("current_user") || "{}");
    const user_roles_data: any = await lastValueFrom(this.usersService.getUserRoles(this.current_user?.uuid));
    const access_limit = user_roles_data?.data?.access_limit;


    const savedFieldLabel = this.fieldLabels?.filter((field_label: any) => field_label?.field_id === this.selectedLocationType?.value)[0] || undefined
    console.log(this.selectedLocationType, 'his.selectedLocationType')
    const locationsFromDb = await lastValueFrom(this.settingConfigService.getUniqueValuesOfField(this.selectedLocationType?.value))
    let locationsFromQuestions: any = await this.genericIndexedDbService.getDataByKeys(OBJECTSTORE_VA_QUESTIONS, [this.selectedLocationType?.value])

    locationsFromQuestions = locationsFromQuestions?.length ? locationsFromQuestions?.filter((objectedLocation: any) => objectedLocation)[0] : undefined;

    if (locationsFromQuestions?.value?.options?.length && locationsFromDb?.data?.length) {
      this.allLocations = locationsFromQuestions?.value?.options?.filter((locationToFilter: any) => locationsFromDb?.data?.some((location: any) => locationToFilter?.value === location))?.map((location: any) => {
        return {
          name: savedFieldLabel?.options?.hasOwnProperty(location?.value) ? savedFieldLabel?.options[location?.value] : location?.label,
          value: location?.value,
          unique: location?.value
        }
      })
    } else {
      this.allLocations = locationsFromDb?.data?.map((location: any) => {
        return {
          name: savedFieldLabel?.options?.hasOwnProperty(location) ? savedFieldLabel?.options[location] : location,
          value: location,
          unique: location
        }
      }) || []
    }
    if (access_limit && this.selectedLocationType?.value === access_limit?.field) {
      this.selectedLocation = this.allLocations?.filter((location) => access_limit?.limit_by?.some((access_limit: any) => location?.value === access_limit?.value))
    }
  }

  applyFilters(): void {
    this.closeDropdown.emit();
    const formattedStartDate = this.startDate
      ? this.datePipe.transform(this.startDate, 'yyyy-MM-dd')?.toString()
      : undefined;
    const formattedEndDate = this.endDate
      ? this.datePipe.transform(this.endDate, 'yyyy-MM-dd')?.toString()
      : undefined;
    var locations: string[] = [];
    if (
      this.selectedLocation.length > 0 &&
      this.selectedLocation !== undefined
    ) {
      locations = this.selectedLocation;
    }
    const filterData = {
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      locations: locations,
      date_type: this.selectedDateType,
      ccva_graph_db_source: true,
    };
    console.log('Filters applied:', filterData);
    // You can now apply filters based on the selected date type and other fields.
    this.filterService.setFilterData(filterData);
  }

  resetFilters(): void {
    this.selectedDateType = undefined;
    this.startDate = undefined;
    this.endDate = undefined;
    this.selectedLocation = [];
    const filterData = {
      start_date: undefined,
      end_date: undefined,
      locations: [],
      date_type: undefined,
      ccva_graph_db_source: true,
    };
    this.resetSelection.emit();
    this.filterService.setFilterData(filterData);
  }

  onSearchableChange(selectedItems: any) {
    this.selectedLocation = selectedItems;
  }
  onOpenSelectField(isOpen: boolean) {
    if (isOpen) {
      this.addHeightClass('h-[400px]', 'h-60');
    } else {
      this.addHeightClass('h-60', 'h-[400px]');
    }
  }

  addHeightClass(addclassName?: string, removeClassName?: string) {
    const dialogElement = document.querySelector(
      '.cdk-overlay-pane.mat-mdc-dialog-panel'
    );
    if (dialogElement) {
      if (addclassName) {
        (dialogElement as HTMLElement).classList.add(addclassName);
      }
      if (removeClassName) {
        (dialogElement as HTMLElement).classList.remove(removeClassName);
      }
    }
  }
}
