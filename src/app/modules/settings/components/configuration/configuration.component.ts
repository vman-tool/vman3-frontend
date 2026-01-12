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
import { VaRecordsService } from 'app/modules/pcva/services/va-records/va-records.service';
import { DataSyncService } from '../../services/data_sync.service';
import { OBJECTKEY_ODK_QUESTIONS } from 'app/shared/constants/odk.constants';
import { map } from 'rxjs';


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

  // Questions Sync Properties
  syncedQuestions?: any[] = [];
  forceChecked: boolean = false;
  isQuestionsSyncing: boolean = false;
  isQuestionsSyncTabLoading: boolean = false;

  // Cache state to prevent unnecessary reloads
  private dataLoaded = false;

  constructor(
    public dialog: MatDialog,
    private settingConfigService: SettingConfigService,
    private indexedDBService: IndexedDBService,
    private genericIndexedDbService: GenericIndexedDbService,
    private authService: AuthService,
    private vaRecordsService: VaRecordsService,
    private dataSyncService: DataSyncService,
  ) { }

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
      updateAccessLocationsLabels: await this.hasAccess([privileges.USERS_UPDATE_ACCESS_LIMIT_LABELS]),
      canSyncODKQuestions: await this.hasAccess([privileges.ODK_QUESTIONS_SYNC]),

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

  onLoadLabelAccess() {
    this.selectedTab = "";

    this.refreshData();

    this.selectedTab = "label-access-fields";

  }

  // Question Sync Methods

  loadQuestionsSyncTab() {
    console.log('Loading Questions Synchronization tab...');
    this.isQuestionsSyncTabLoading = true;

    // Load questions data
    this.loadQuestions().then(() => {
      this.isQuestionsSyncTabLoading = false;
      console.log('Questions Synchronization tab loaded');
    }).catch((error) => {
      console.error('Error loading questions tab:', error);
      this.isQuestionsSyncTabLoading = false;
    });
  }

  private async loadQuestions(): Promise<void> {
    try {
      // Load questions from IndexedDB or API
      this.syncedQuestions = await this.genericIndexedDbService.getData(
        OBJECTSTORE_VA_QUESTIONS
      );

      // If no questions found, try to sync them
      if (!this.syncedQuestions?.length) {
        await this.syncQuestionsIfNeeded();
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      throw error;
    }
  }

  async syncQuestionsIfNeeded() {
    this.isQuestionsSyncing = true;

    // this.syncedQuestions = await this.indexedDBService.getQuestions();
    this.syncedQuestions = await this.genericIndexedDbService.getData(
      OBJECTSTORE_VA_QUESTIONS
    );

    if (!this.syncedQuestions?.length) {
      console.log('No synced questions found, starting sync...');
      this.syncedQuestions = await lastValueFrom(
        this.vaRecordsService.getQuestions().pipe(
          map(async (response: any) => {
            if (response?.data) {
              // await this.indexedDBService.addQuestions(response?.data);
              // await this.indexedDBService.addQuestionsAsObject(response?.data);

              await this.genericIndexedDbService.addDataAsObjectValues(
                OBJECTSTORE_VA_QUESTIONS,
                response?.data
              );
              await this.genericIndexedDbService.addDataAsIs(
                OBJECTSTORE_VA_QUESTIONS,
                OBJECTKEY_ODK_QUESTIONS,
                response?.data
              );

              // Sync status will be updated automatically by backend - no manual update needed

              // return await this.indexedDBService.getQuestions();
              return await this.genericIndexedDbService.getData(
                OBJECTSTORE_VA_QUESTIONS
              );
            }
          })
        )
      );
    }

    if (!this.syncedQuestions) {
      console.error('Failed to sync questions.');
    } else {
      console.log(`${this.syncedQuestions.length} questions synced.`);
    }

    this.isQuestionsSyncing = false;
  }

  async onSyncQuestions() {
    this.isQuestionsSyncing = true;
    this.syncedQuestions = undefined;

    if (!this.forceChecked) {
      this.syncedQuestions = await lastValueFrom(
        this.vaRecordsService.getQuestions().pipe(
          map(async (response: any) => {
            if (response?.data) {
              // await this.indexedDBService.addQuestions(response?.data);
              // return await this.indexedDBService.getQuestions();

              await this.genericIndexedDbService.addDataAsObjectValues(
                OBJECTSTORE_VA_QUESTIONS,
                response?.data
              );
              await this.genericIndexedDbService.addDataAsIs(
                OBJECTSTORE_VA_QUESTIONS,
                OBJECTKEY_ODK_QUESTIONS,
                response?.data
              );

              return await this.genericIndexedDbService.getData(
                OBJECTSTORE_VA_QUESTIONS
              );
            }
          })
        )
      );
    }

    if (!this.syncedQuestions) {
      this.syncedQuestions = await lastValueFrom(
        this.dataSyncService.syncQuestions().pipe(
          map(async (response: any) => {
            // await this.indexedDBService.addQuestions(response?.data);
            // this.forceChecked = !this.forceChecked;
            // return await this.indexedDBService.getQuestions();

            await this.genericIndexedDbService.addDataAsObjectValues(
              OBJECTSTORE_VA_QUESTIONS,
              response?.data
            );
            await this.genericIndexedDbService.addDataAsIs(
              OBJECTSTORE_VA_QUESTIONS,
              OBJECTKEY_ODK_QUESTIONS,
              response?.data
            );

            this.forceChecked = !this.forceChecked;

            // Sync status will be updated automatically by backend - no manual update needed

            return await this.genericIndexedDbService.getData(
              OBJECTSTORE_VA_QUESTIONS
            );
          })
        )
      );
    }

    this.isQuestionsSyncing = false;
  }

  onForceCheck(event: any, isChecked: boolean) {
    this.forceChecked = event.target.checked;
  }
}
