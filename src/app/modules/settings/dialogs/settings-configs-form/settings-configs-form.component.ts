import { Component, Inject, OnInit } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormControl,
} from '@angular/forms';
import { SettingConfigService } from '../../services/settings_configs.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FieldMapping, OdkConfigModel, SystemConfig } from '../../interface';

@Component({
  selector: 'app-settings-configs-form',
  templateUrl: './settings-configs-form.component.html',
  styleUrls: ['./settings-configs-form.component.scss'],
})
export class SettingsConfigsFormComponent implements OnInit {
  selectedTab: 'odk_api_configs' | 'system_configs' | 'field_mapping' =
    'system_configs'; // Default selected tab
  systemConfigForm!: FormGroup;
  fieldMappingForm!: FormGroup;
  odkApiConfigForm!: FormGroup;

  // Your tables and fields arrays
  tables: string[] = ['Table1', 'Table2', 'Table3']; // Example data
  fields: string[] = ['Field1', 'Field2', 'Field3']; // Example data

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SettingsConfigsFormComponent>,
    private settingsConfigService: SettingConfigService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {
    this.selectedTab = data.type || 'system_configs'; // Initialize selected tab based on input data
  }

  ngOnInit(): void {
    this.initForms();
    this.loadDropdownData(); // Load data for dropdowns
    this.loadConfigData(); // Load existing configuration (if any)
  }

  initForms(): void {
    this.systemConfigForm = this.fb.group({
      app_name: ['', Validators.required],
      page_title: ['', Validators.required],
      page_subtitle: [''],
      admin_level1: ['', Validators.required],
      admin_level2: [''],
      admin_level3: [''],
      admin_level4: [''],
      map_center: ['', Validators.required],
    });

    this.fieldMappingForm = this.fb.group({
      table_name: ['', Validators.required],
      table_details: [''],
      instance_id: ['', Validators.required],
      va_id: ['', Validators.required],
      consent_id: [''],
      date: ['', Validators.required],
      location_level1: ['', Validators.required],
      location_level2: [''],
      deceased_gender: [''],
      is_adult: [''],
      is_child: [''],
      i_neonate: [''],
      interviewer_name: ['', Validators.required],
      interviewer_phone: [''],
      interviewer_sex: [''],
    });

    this.odkApiConfigForm = this.fb.group({
      url: [
        '',
        [Validators.required, Validators.pattern(/^(https?:\/\/[^\s]+)$/)],
      ],
      username: ['', Validators.required],
      password: ['', Validators.required],
      form_id: ['', Validators.required],
      project_id: ['', Validators.required],
      api_version: ['v1'],
      is_sort_allowed: [false],
    });
  }

  loadDropdownData(): void {
    // this.settingsConfigService.getTables().subscribe(
    //   (tables: string[]) => {
    //     this.tables = tables;
    //   },
    //   (error) => {
    //     console.error('Error loading tables:', error);
    //   }
    // );

    // this.settingsConfigService.getFields().subscribe(
    //   (fields: string[]) => {
    //     this.fields = fields;
    //   },
    //   (error) => {
    //     console.error('Error loading fields:', error);
    //   }
    // );
  }

  loadConfigData(): void {
    this.settingsConfigService.getSettingsConfig().subscribe((config) => {
      if (!config) {
        this.snackBar.open(
          'Default settings are loaded , please edit to match the correct settings, or save to use the default settings',
          'Close',
          {
            duration: 3000,
          }
        );
      } else {
        
        if (!Object.keys(config!?.field_mapping).length) {
          const fieldMappingPayload: FieldMapping = {
            table_name: 'table_name',
            table_details: 'table details',
            instance_id: 'instanceid',
            va_id: 'VA ID',
            consent_id: 'id10013',
            date: 'today',
            location_level1: 'id10005r',
            location_level2: 'id10005d',
            deceased_gender: 'id10019',
            is_adult: 'isadult',
            is_child: 'ischild',
            is_neonate: 'isneonatal',
            interviewer_name: 'id10010',
            interviewer_phone: 'id10010phone',
            interviewer_sex: 'id10010b',
            resp_gender: 'id10007a',
            resp_name: 'Id10007',
            resp_phone: 'id10007Phone',
            resp_relationship: 'id10008',
            intv_gps: 'coordinates',
            intv_gps_acc: 'accuracy',
          };
          this.fieldMappingForm.patchValue(fieldMappingPayload || {});
        } else {
          this.fieldMappingForm.patchValue(config?.field_mapping);
        }

        if (!Object.keys(config!?.system_configs).length) {
          const systemConfig: SystemConfig = {
            app_name: 'VMan33',
            page_title: 'The United Republic of Tanzania',
            page_subtitle: 'Verbal Autopsy Management Dashboard',
            admin_level1: 'Region',
            admin_level2: 'District',
            admin_level3: 'Ward',
            admin_level4: 'Village',
            map_center: '[-6.3, 34.8]',
          };
          this.systemConfigForm.patchValue(systemConfig || {});
        } else {
          this.systemConfigForm.patchValue(config?.system_configs);
        }

        if (!Object.keys(config!?.odk_api_configs).length) {
          const odkConfigPayload: OdkConfigModel = {
            url: 'https://central.iact.co.tz',
            username: 'admin@vman.net',
            password: 'welcome2vman',
            form_id: 'WHOVA_V1_5_3_TZV1',
            project_id: '2', // Using string to match the interface
            api_version: 'v1',
          };
          this.odkApiConfigForm.patchValue(odkConfigPayload || {});
        } else {
          this.odkApiConfigForm.patchValue(config?.odk_api_configs || {});
        }
      }
    });
  }

  onSystemConfigSubmit(): void {
    if (this.systemConfigForm.valid) {
      this.settingsConfigService
        .saveConnectionData('system_configs', this.systemConfigForm.value)
        .subscribe(
          {
            next: (response) => {
            this.snackBar.open(
              'System configuration saved successfully',
              'Close',
              {
                duration: 3000,
              }
            );
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.snackBar.open('Failed to save system configuration', 'Close', {
              duration: 3000,
            });
          }
          }
        );
    } else {
      this.snackBar.open('System configuration form is invalid', 'Close', {
        duration: 3000,
      });
    }
  }

  onFieldMappingSubmit(): void {
    if (this.fieldMappingForm.valid) {
      this.settingsConfigService
        .saveConnectionData('field_mapping', this.fieldMappingForm.value)
        .subscribe(
          (response) => {
            this.snackBar.open('Field mapping saved successfully', 'Close', {
              duration: 3000,
            });
            this.dialogRef.close(true);
          },
          (error) => {
            this.snackBar.open('Failed to save field mapping', 'Close', {
              duration: 3000,
            });
          }
        );
    } else {
      this.snackBar.open('Field mapping form is invalid', 'Close', {
        duration: 3000,
      });
    }
  }

  onOdkApiConfigSubmit(): void {
    if (this.odkApiConfigForm.valid) {
      this.settingsConfigService
        .saveConnectionData('odk_api_configs', this.odkApiConfigForm.value)
        .subscribe(
          (response) => {
            this.snackBar.open(
              'ODK API configuration saved successfully',
              'Close',
              {
                duration: 3000,
              }
            );
            this.dialogRef.close(true);
          },
          (error) => {
            this.snackBar.open(
              'Failed to save ODK API configuration',
              'Close',
              {
                duration: 3000,
              }
            );
          }
        );
    } else {
      this.snackBar.open('ODK API configuration form is invalid', 'Close', {
        duration: 3000,
      });
    }
  }
}
