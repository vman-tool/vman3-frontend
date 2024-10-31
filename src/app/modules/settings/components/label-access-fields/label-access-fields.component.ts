import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UsersService } from '../../services/users.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { SettingConfigService } from '../../services/settings_configs.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-label-access-fields',
  templateUrl: './label-access-fields.component.html',
  styleUrls: ['./label-access-fields.component.scss']
})
export class LabelAccessFieldsComponent implements OnInit {
  @Input() system_config?: any;
  @Input() field_mapping?: any;
  @Input() field_labels?: any;

  @Output() load_settings: EventEmitter<any> = new EventEmitter();

  labelsForm: FormGroup;
  locationTypes: any[] = [];
  locations: { name: string; value: string; unique: string }[] = [];
  selectedLocationType?: any;

  accessLimit?: any;
  loadLocations: boolean = false;
  searchText: string = '';
  existingFormValues: any = {};
  initiatingForm: boolean = false;

  constructor(
    private usersService: UsersService,
    private indexedDBService: IndexedDBService,
    private settingConfigService: SettingConfigService,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder
  ) {
    this.labelsForm = this.formBuilder.group({});
  }

  ngOnInit(): void {
    this.getLocationFields();
  }

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000
    });
  }

  getLocationFields() {
    this.locationTypes = [
      { label: this.system_config?.admin_level1, value: this.field_mapping?.location_level1 },
      { label: this.system_config?.admin_level2, value: this.field_mapping?.location_level2 },
      { label: this.system_config?.admin_level3, value: this.field_mapping?.location_level3 },
      { label: this.system_config?.admin_level4, value: this.field_mapping?.location_level4 }
    ];
  }

  async onSelectLocationType(e: any) {
    e?.stopPropagation();
    this.loadLocations = true;
    this.selectedLocationType = this.locationTypes?.find((locationType) => locationType?.value === e?.target?.value);

    if (this.selectedLocationType) {
      await this.setLocations();
    }
    this.loadLocations = false;
  }

  async setLocations() {
    const savedFieldLabel = this.field_labels?.find((field_label: any) => field_label?.field_id === this.selectedLocationType?.value) || undefined;
    const locationsFromDb = await lastValueFrom(this.settingConfigService.getUniqueValuesOfField(this.selectedLocationType?.value));
    let locationsFromQuestions: any = await this.indexedDBService.getQuestionsByKeys([this.selectedLocationType?.value]);

    locationsFromQuestions = locationsFromQuestions?.length ? locationsFromQuestions?.filter((objectedLocation: any) => objectedLocation)[0] : undefined;

    if (locationsFromQuestions?.value?.options?.length && locationsFromDb?.data?.length) {
      this.locations = locationsFromQuestions?.value?.options?.filter((locationToFilter: any) => locationsFromDb?.data?.some((location: any) => locationToFilter?.value === location))?.map((location: any) => {
        return {
          name: savedFieldLabel?.options?.hasOwnProperty(location?.value) ? savedFieldLabel?.options[location?.value] : location?.label,
          value: location?.value,
          unique: location?.value
        };
      });
    } else {
      this.locations = locationsFromDb?.data?.map((location: any) => {
        return {
          name: savedFieldLabel?.options?.hasOwnProperty(location) ? savedFieldLabel?.options[location] : location,
          value: location,
          unique: location
        };
      }) || [];
    }

    if (this.accessLimit && this.selectedLocationType?.value === this.accessLimit?.field) {
      this.locations = this.locations?.filter((location) => !this.accessLimit?.limit_by?.some((access_limit: any) => location?.value === access_limit?.value));
    }

    this.createForm();
  }

  createForm() {
    this.initiatingForm = true;
    let values: any = {}
    Object.keys(this.labelsForm?.value)?.forEach((key: string) => {
      if (this.labelsForm.value[key]?.length) {
        values[key] = this.labelsForm.value[key];
      }
    })
    
    this.existingFormValues = {
      ...this.existingFormValues,
      ...values
    }

    const filteredLocations = this.getFilteredLocations();
    
    this.labelsForm = this.formBuilder.group({});
    
    filteredLocations.forEach((location) => {
      const initialValue = this.existingFormValues[location.value] || (location?.name !== location.value ? location?.name : '');
      this.labelsForm.addControl(location.value, this.formBuilder.control(initialValue));
    });

    this.initiatingForm = false;
  }

  getFilteredLocations() {
    return this.locations.filter((location) =>
      location.name?.toLowerCase().includes(this.searchText?.toLowerCase()) || location.value?.toLowerCase().includes(this.searchText?.toLowerCase())
    );
  }

  onSearch() {
    this.createForm();
  }

  async onSubmitLabels(e: Event) {
    let values: any = {};

    Object.keys(this.labelsForm.value).forEach((key: string) => {
      if (this.labelsForm.value[key]?.length) {
        values[key] = this.labelsForm.value[key];
      }
    });

    const labels_data = [
      {
        field_id: this.selectedLocationType?.value,
        options: values
      }
    ];

    const saved_labels = await lastValueFrom(this.settingConfigService.saveConnectionData("field_labels", labels_data));
    if (!saved_labels?.error) {
      this.loadLocations = true;
      const get_settings = await lastValueFrom(this.settingConfigService.getSettingsConfig());

      this.field_labels = get_settings?.field_labels;

      await this.setLocations();

      this.loadLocations = false;
      this.load_settings.emit();

      this.notificationMessage('Labels saved successfully');
    } else {
      this.notificationMessage('Failed to save labels');
    }
  }
}
