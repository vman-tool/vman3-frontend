import { Component, EventEmitter, Input, OnInit } from '@angular/core';
import { FilterService } from '../../../services/filter.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { SharedModule } from '../../../shared.module';
import { CustomDropdownComponent } from '../../../components/custom-dropdown/custom-dropdown.component';
import { UsersService } from 'app/modules/settings/services/users.service';
import { lastValueFrom } from 'rxjs';
import { FieldLabel, FieldMapping, settingsConfigData, SystemConfig } from 'app/modules/settings/interface';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { ListRecordsService } from 'app/modules/records/services/list-records/list-records.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  LocationTreeSelectComponent,
  LocationLevel,
  LocationSelection,
} from 'app/shared/components/location-tree-select/location-tree-select.component';

@Component({
  selector: 'app-va-filters',
  standalone: true,

  imports: [
    FormsModule,
    CommonModule,
    SharedModule,
    FormsModule,
    CustomDropdownComponent,
    MatProgressSpinnerModule,
    LocationTreeSelectComponent,
  ],
  templateUrl: './va-filters.component.html',
  styleUrl: './va-filters.component.scss',
})
export class VaFiltersComponent implements OnInit {
  selectedDateType?: string = 'death_date';
  startDate?: Date;
  endDate?: Date;
  // A user can now filter by a combination of places spanning several admin
  // levels at once (e.g. one region OR one ward elsewhere), matching how
  // access_limit restrictions work.
  selectedLocations: LocationSelection[] = [];
  current_user?: any

  isLoading: boolean = true;
  isExporting: boolean = false;
  resetSelection = new EventEmitter<void>();
  closeDropdown = new EventEmitter<void>();

  resultsFilterOptions = [
    { value: 'both', label: 'With Both CCVA & PCVA' },
    { value: 'all', label: 'All Records' },

    { value: 'ccva_only', label: 'With CCVA Only' },
    { value: 'pcva_only', label: 'With PCVA Only' }
  ];

  systemConfigData?: SystemConfig;
  fieldMappingData?: FieldMapping;
  fieldLabels: FieldLabel[] | undefined;
  // The admin levels this user can filter by - unrestricted users get all
  // configured levels starting at Region; a location-restricted user only
  // gets levels at or below their own (see initLocationAccess()).
  locationTypes: LocationLevel[] = [];
  // This user's own access_limit, translated into the tree's selection
  // shape - when non-empty, the location tree roots at these places instead
  // of Region, since that's all this user has permission to see anyway.
  creatorBoundary: LocationSelection[] = [];

  constructor(
    private filterService: FilterService,
    private usersService: UsersService,
    private settingConfigService: SettingConfigService,
    private datePipe: DatePipe,
    private listRecordsService: ListRecordsService
  ) { }

  ngOnInit(): void {
    this.resetFilterData();
    this.initLocationAccess();
  }

  async loadSystemConfigurations() {
    const data = await lastValueFrom(
      this.settingConfigService.getSettingsConfig()
    );
    if (data) {
      this.systemConfigData = data.system_configs;
      this.fieldMappingData = data.field_mapping;
      this.fieldLabels = data.field_labels;
      this.computeDateTypeOptions();
    }
  }

  dateTypeOptions: { value: string; label: string }[] = [
    { value: 'submission_date', label: 'Submission Date' },
    { value: 'interview_date', label: 'Interview Date' },
    { value: 'death_date', label: 'Date of Death' },
  ];

  private computeDateTypeOptions(): void {
    const fm = this.fieldMappingData;
    if (!fm) return;
    const opts: { value: string; label: string }[] = [];
    if (fm.submitted_date) opts.push({ value: 'submission_date', label: 'Submission Date' });
    if (fm.interview_date) opts.push({ value: 'interview_date', label: 'Interview Date' });
    if (fm.death_date) opts.push({ value: 'death_date', label: 'Date of Death' });
    if (opts.length) this.dateTypeOptions = opts;
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

  // Figures out which admin levels this user may filter by, and - if their
  // own access is itself restricted - which place(s) the location tree
  // should root at. Previously this fetched the FULL unscoped value list for
  // whichever single field the access_limit happened to name, then got
  // raced/overwritten by a second, unrelated fetch - the actual bug behind
  // a level-2-restricted user seeing every location in the tree. The tree
  // component now owns its own (correctly scoped) fetching, so this just
  // needs to establish the boundary, not the values within it.
  async initLocationAccess() {
    await this.loadSystemConfigurations();
    this.current_user = JSON.parse(localStorage.getItem("current_user") || "{}");

    const allLevels: LocationLevel[] = [
      { label: this.systemConfigData?.admin_level1 || '', value: this.fieldMappingData?.location_level1 || '', level: 1 },
      { label: this.systemConfigData?.admin_level2 || '', value: this.fieldMappingData?.location_level2 || '', level: 2 },
      { label: this.systemConfigData?.admin_level3 || '', value: this.fieldMappingData?.location_level3 || '', level: 3 },
      { label: this.systemConfigData?.admin_level4 || '', value: this.fieldMappingData?.location_level4 || '', level: 4 },
    ];

    const user_roles_data: any = await lastValueFrom(this.usersService.getUserRoles(this.current_user?.uuid));
    const access_limit = user_roles_data?.data?.access_limit;

    // Supports both the legacy shape (a single top-level `field` shared by
    // all limit_by items) and the current shape (each item carries its own
    // `field`).
    const legacyField: string = access_limit?.field ?? '';
    this.creatorBoundary = (access_limit?.limit_by || [])
      .map((item: any) => {
        const field = item?.field || legacyField;
        const levelDef = allLevels.find(l => l.value === field);
        return field && item?.value != null ? {
          field,
          field_label: levelDef?.label || field,
          label: item?.label || item?.value,
          value: item?.value,
        } : null;
      })
      .filter((item: any): item is LocationSelection => !!item);

    const boundaryLevels = this.creatorBoundary
      .map(b => allLevels.find(l => l.value === b.field)?.level ?? 0)
      .filter((l: number) => l > 0);
    const boundaryLevel = boundaryLevels.length ? Math.min(...boundaryLevels) : 0;

    this.locationTypes = allLevels
      .filter(l => l.label && l.value)
      .filter(l => boundaryLevel === 0 || l.level >= boundaryLevel);

    // Pre-check the user's own place(s) as a starting point, matching the
    // previous behavior - actual filtering still only takes effect once
    // they click Apply, same as any other filter here.
    if (this.creatorBoundary.length) {
      this.selectedLocations = this.creatorBoundary;
    }

    this.isLoading = false;
  }

  applyFilters(): void {
    this.closeDropdown.emit();
    const formattedStartDate = this.startDate
      ? this.datePipe.transform(this.startDate, 'yyyy-MM-dd')?.toString()
      : undefined;
    const formattedEndDate = this.endDate
      ? this.datePipe.transform(this.endDate, 'yyyy-MM-dd')?.toString()
      : undefined;
    const filterData = {
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      locations: this.selectedLocations,
      date_type: this.selectedDateType,
      ccva_graph_db_source: true,
    };
    this.filterService.setFilterData(filterData);
  }

  resetFilters(): void {
    this.selectedDateType = undefined;
    this.startDate = undefined;
    this.endDate = undefined;
    this.selectedLocations = [];
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

  onLocationSelectionChange(selection: LocationSelection[]): void {
    this.selectedLocations = selection;
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
