import { FieldMapping, SystemConfig } from '../../interface';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConnectionFormComponent } from '../../dialogs/connection-form/connection-form.component';
import { OdkConfigModel, settingsConfigData } from '../../interface';
import { SettingConfigService } from '../../services/settings_configs.service';
import { ResponseMainModel } from '../../../../shared/interface/main.interface';
import { SettingsConfigsFormComponent } from '../../dialogs/settings-configs-form/settings-configs-form.component';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss'],
})
export class ConfigurationComponent {
  isLoading = true; // Add isLoading state
  hasOdkApiData = false;
  odkApiData: OdkConfigModel | undefined;
  systemConfigData: SystemConfig | undefined;
  fieldMappingData: FieldMapping | undefined;

  selectedTab = 'system-config'; // Default selected tab

  constructor(
    public dialog: MatDialog,
    private settingConfigService: SettingConfigService
  ) {}

  ngOnInit(): void {
    this.loadOdkApiData();
  }

  loadOdkApiData(): void {
    this.isLoading = true; // Start isLoading
    this.settingConfigService.getSettingsConfig().subscribe(
      (data: settingsConfigData | null) => {
        this.hasOdkApiData = !!data;
        if (this.hasOdkApiData && data) {
          console.log('ODK API data:', data);
          this.odkApiData = data.odk_api_configs;
          this.systemConfigData = data.system_configs;
          this.fieldMappingData = data.field_mapping;
        }
        this.isLoading = false; // Stop isLoading
      },
      (error) => {
        console.error('Failed to load ODK API data:', error);
        this.isLoading = false; // Stop isLoading even on error
      }
    );
  }

  editOdkApi(): void {
    const dialogRef = this.dialog.open(ConnectionFormComponent, {
      width: '700px',
      data: this.odkApiData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.odkApiData = result;
        this.hasOdkApiData = true;
      }
    });
  }

  editForm(type: 'odk_api_configs' | 'system_configs' | 'field_mapping'): void {
    const dialogRef = this.dialog.open(SettingsConfigsFormComponent, {
      width: '700px',
      data: {
        type: type,
        ...this.odkApiData,
      },
      maxHeight: '98vh',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.odkApiData = result;
        this.hasOdkApiData = true;
      }
    });
  }

  addOdkApi(): void {
    this.editOdkApi();
  }
}
