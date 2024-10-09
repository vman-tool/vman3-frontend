import { FieldMapping, SystemConfig } from '../../interface';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConnectionFormComponent } from '../../dialogs/connection-form/connection-form.component';
import { OdkConfigModel, settingsConfigData } from '../../interface';
import { SettingConfigService } from '../../services/settings_configs.service';
import { ResponseMainModel } from '../../../../shared/interface/main.interface';
import { SettingsConfigsFormComponent } from '../../dialogs/settings-configs-form/settings-configs-form.component';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { lastValueFrom } from 'rxjs';

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
  vaSummaryData: string[] = [];

  selectedTab = 'system-config'; // Default selected tab
  vaSummaryObjects?: any

  constructor(
    public dialog: MatDialog,
    private settingConfigService: SettingConfigService,
    private indexedDBService: IndexedDBService
  ) {}

  ngOnInit(): void {
    this.loadOdkApiData();
  }

  loadOdkApiData(): void {
    this.isLoading = true; // Start isLoading
    this.settingConfigService.getSettingsConfig().subscribe({
      next: async (data: settingsConfigData | null) => {
        this.hasOdkApiData = !!data;
        if (this.hasOdkApiData && data) {
          this.odkApiData = data.odk_api_configs;
          this.systemConfigData = data?.system_configs;
          this.fieldMappingData = data?.field_mapping;
          this.vaSummaryData = data?.va_summary;
          this.vaSummaryObjects =  data?.va_summary && data?.va_summary !== null ? await this.indexedDBService.getQuestionsByKeys(data?.va_summary) : [];
        }
        this.isLoading = false; // Stop isLoading
      },
      error: (error) => {
        console.error('Failed to load ODK API data:', error);
        this.isLoading = false; // Stop isLoading even on error
      }
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

  editForm(type: 'odk_api_configs' | 'system_configs' | 'field_mapping' | 'va_summary'): void {
    const data = type === 'va_summary' ? {'va_summary' : this.vaSummaryData} : this.odkApiData
    const dialogRef = this.dialog.open(SettingsConfigsFormComponent, {
      width: type === 'field_mapping' ? '40%' : '50%',
      data: {
        type: type,
        ...data,
      },
      maxHeight: '98vh',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        if(type === 'va_summary') {
          this.vaSummaryData = result;
          this.vaSummaryObjects = await this.indexedDBService.getQuestionsByKeys(result);
        }
        this.odkApiData = result;
        this.hasOdkApiData = true;
      }
    });
  }

  addOdkApi(): void {
    this.editOdkApi();
  }
}
