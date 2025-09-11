import { FieldLabel, FieldMapping, SystemConfig, SystemImages } from '../../interface';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConnectionFormComponent } from '../../dialogs/connection-form/connection-form.component';
import { OdkConfigModel, settingsConfigData } from '../../interface';
import { SettingConfigService } from '../../services/settings_configs.service';
import { SettingsConfigsFormComponent } from '../../dialogs/settings-configs-form/settings-configs-form.component';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { lastValueFrom } from 'rxjs';
import { AuthService } from 'app/core/services/authentication/auth.service';
import * as privileges from 'app/shared/constants/privileges.constants';
import { GenericIndexedDbService } from 'app/shared/services/indexedDB/generic-indexed-db.service';
import { OBJECTSTORE_VA_QUESTIONS } from 'app/shared/constants/indexedDB.constants';


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

  dataAccess?: any;

  selectedTab = 'system-config'; // Default selected tab
  vaSummaryObjects?: any;
  fieldLabels: FieldLabel[] | undefined;

  // Cache state to prevent unnecessary reloads
  private dataLoaded = false;

  constructor(
    public dialog: MatDialog,
    private settingConfigService: SettingConfigService,
    private indexedDBService: IndexedDBService,
    private genericIndexedDbService: GenericIndexedDbService,
    private authService: AuthService,
  ) {}

  async hasAccess(privileges: string[]) {
    return await lastValueFrom(this.authService.hasPrivilege(privileges));
  }

  async ngOnInit(): Promise<void> {
    // Only load data if not already loaded
    if (!this.dataLoaded) {
      this.loadOdkApiData();
    }

    this.dataAccess = {
      addSystemConfigs: await this.hasAccess([privileges.SETTINGS_CREATE_SYSTEM_CONFIGS]),
      updateSystemConfigs: await this.hasAccess([privileges.SETTINGS_UPDATE_SYSTEM_CONFIGS]),
      viewSystemConfigs: await this.hasAccess([privileges.SETTINGS_VIEW_SYSTEM_CONFIGS]),
      addODKSettings: await this.hasAccess([privileges.SETTINGS_CREATE_ODK_DETAILS]),
      updateODKSettings: await this.hasAccess([privileges.SETTINGS_UPDATE_ODK_DETAILS]),
      viewODKSettings: await this.hasAccess([privileges.SETTINGS_VIEW_ODK_DETAILS]),
      addFieldMapping: await this.hasAccess([privileges.SETTINGS_CREATE_FIELD_MAPPING]),
      updateFieldMapping: await this.hasAccess([privileges.SETTINGS_UPDATE_FIELD_MAPPING]),
      viewFieldMapping: await this.hasAccess([privileges.SETTINGS_VIEW_FIELD_MAPPING]),
      addSummaryFields: await this.hasAccess([privileges.SETTINGS_CREATE_VA_SUMMARY]),
      updateSummaryFields: await this.hasAccess([privileges.SETTINGS_UPDATE_VA_SUMMARY]),
      viewSummaryFields: await this.hasAccess([privileges.SETTINGS_VIEW_VA_SUMMARY]),
      updateSystemImages: await this.hasAccess([privileges.SETTINGS_UPDATE_SYSTEM_IMAGES]),
      updateAccessLocationsLabels: await this.hasAccess([privileges.USERS_UPDATE_ACCESS_LIMIT_LABELS])

    }
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
          this.fieldLabels = data?.field_labels;
          this.vaSummaryObjects =
            data?.va_summary && data?.va_summary !== null
              // ? await this.indexedDBService.getQuestionsByKeys(data?.va_summary)
              ? await this.genericIndexedDbService.getDataByKeys(OBJECTSTORE_VA_QUESTIONS, data?.va_summary)
              : [];
        }
        this.isLoading = false; // Stop isLoading
        this.dataLoaded = true; // Mark data as loaded
      },
      error: (error) => {
        console.error('Failed to load ODK API data:', error);
        this.isLoading = false; // Stop isLoading even on error
      },
    });
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
        this.refreshData();
      }
    });
  }

  // Method to force refresh data
  refreshData(): void {
    this.dataLoaded = false;
    this.settingConfigService.clearCache();
    this.loadOdkApiData();
  }

  editForm(
    type: 'odk_api_configs' | 'system_configs' | 'field_mapping' | 'va_summary'
  ): void {
    const data =
      type === 'va_summary'
        ? { va_summary: this.vaSummaryData }
        : this.odkApiData;
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
        if (type === 'va_summary') {
          this.vaSummaryData = result;
          // this.vaSummaryObjects = await this.indexedDBService.getQuestionsByKeys(result);
          this.vaSummaryObjects = await this.genericIndexedDbService.getDataByKeys(OBJECTSTORE_VA_QUESTIONS, result);
        }

        this.odkApiData = result;
        this.hasOdkApiData = true;
        this.refreshData();
      }
    });
  }

  addOdkApi(): void {
    this.editOdkApi();
  }

  onLoadLabelAccess(){
    this.selectedTab = "";

    this.refreshData();

    this.selectedTab = "label-access-fields";

  }
}
