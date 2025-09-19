import { DataSyncService } from './../../services/data_sync.service';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { lastValueFrom, map, Subscription } from 'rxjs';
import { WebSockettService } from '../../services/web-socket.service';
import { ConfigService } from '../../../../app.service';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { VaRecordsService } from 'app/modules/pcva/services/va-records/va-records.service';
import { LocalStorageSettingsService } from '../../services/local_storage.service';
import * as privileges from 'app/shared/constants/privileges.constants';
import { AuthService } from 'app/core/services/authentication/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GenericIndexedDbService } from 'app/shared/services/indexedDB/generic-indexed-db.service';
import { OBJECTSTORE_VA_QUESTIONS } from 'app/shared/constants/indexedDB.constants';
import { OBJECTKEY_ODK_QUESTIONS } from 'app/shared/constants/odk.constants';
import * as Papa from 'papaparse';
import { MatDialog } from '@angular/material/dialog';
import { HeaderMappingModalComponent } from '../../dialogs/header-mapping/header-mapping.component';
import { RunCcvaService } from '../../../ccva/services/run-ccva.service';
import { SettingConfigService } from '../../services/settings_configs.service';
@Component({
  selector: 'app-data-sync',
  templateUrl: './data-sync.component.html',
  styleUrl: './data-sync.component.scss',
})
export class DataSyncComponent implements OnInit, OnDestroy {
  selectedTab = 'data-synchronization';
  totalRecords: number | null = null;
  progress: string | null = null;
  formSubmissionStatus:
    | {
        earliest_date: string;
        latest_date: string;
        available_data_count: number;
      }
    | undefined;
  syncStatusFromSettings?: any; // New property for sync status from settings
  isLoadingSyncStatus: boolean = false; // Loading state for sync status
  elapsedTime: number | null = null;
  isTaskRunning = false;
  isDataSyncing = false;
  isLoadingFormSubmissionStatus = false;
  // Separate sync flags

  isQuestionsSyncing: boolean = false; // For syncing questions
  isLoadingQuestions: boolean = false; // For initial questions loading

  // Unified loading states
  isSyncButtonLoading: boolean = false; // For sync button loading state
  isSettingsLoading: boolean = false; // For settings tab loading
  isInitialDataLoading: boolean = false; // For initial data loading across all tabs

  // Independent loading states for each tab
  isDataSyncTabLoading: boolean = false; // For Data Synchronization tab
  isQuestionsSyncTabLoading: boolean = false; // For Questions Synchronization tab
  isSettingsTabLoading: boolean = false; // For Settings tab

  syncedQuestions?: any[] = [];
  forceChecked: boolean = false;
  dataSyncAccess?: any;
  csvData: any[] = [];
  private progressSub: Subscription | null = null;
  message: string | undefined;
  private messageSubscription: Subscription | undefined;
  dataSource: 'api' | 'csv' = 'api';
  selectedFile: File | null = null;
  @ViewChild('fileInput') fileInput!: ElementRef;
  requiredHeadersAdditions = ['instanceid'];
  requiredHeaders = [
    'isneonatal',
    'isadult',
    'ischild',
    'ageindays',
    'ageinmonths',
    'ageinyears',
    'id10002',
    'id10003',
    'id10019',
    'id10104',
    'id10105',
    'id10106',
    'id10107',
    'id10120_0',
    'id10161_0',
    'id10172',
    'id10239',
    'id10240',
  ]; // Required headers for CSV data

  fileErrors = '';

  csvHeaders: string[] = [];
  mismatchedHeaders: string[] = [];
  mismatchedHeadersAdditinal: string[] = [];
  showMappingModal = false;
  constructor(
    private dataSyncService: DataSyncService,
    private localStorageSettingsService: LocalStorageSettingsService,
    private configService: ConfigService,
    private webSockettService: WebSockettService,
    private indexedDBService: IndexedDBService,
    private genericIndexedDbService: GenericIndexedDbService,
    private vaRecordsService: VaRecordsService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private runCcvaService: RunCcvaService,
    private settingConfigService: SettingConfigService
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('DataSyncComponent ngOnInit started');
    this.elapsedTime = null;

    await this.loadPreviousProgressFromLocalStorage();
    this.initializeWebSocket();

    // Load permissions
    this.dataSyncAccess = {
      canSyncODKData: await this.hasAccess([privileges.ODK_DATA_SYNC]),
      canSyncODKQuestions: await this.hasAccess([
        privileges.ODK_QUESTIONS_SYNC,
      ]),
    };

    // Load the initially selected tab (data-synchronization by default)
    this.onTabSelected(this.selectedTab);

    console.log('DataSyncComponent ngOnInit completed');
  }

  onTabSelected(tabName: string) {
    console.log(`Tab selected: ${tabName}`);
    this.selectedTab = tabName;

    // Load data specific to the selected tab
    switch (tabName) {
      case 'data-synchronization':
        this.loadDataSyncTab();
        break;
      case 'questions-sync':
        this.loadQuestionsSyncTab();
        break;
      case 'settings':
        this.loadSettingsTab();
        break;
      default:
        console.warn(`Unknown tab: ${tabName}`);
    }
  }



  // Independent loading methods for each tab
  loadDataSyncTab() {
    console.log('Loading Data Synchronization tab...');
    this.isDataSyncTabLoading = true;

    // Load sync status data specific to data sync tab
    this.loadSyncStatusFromSettings();

    // Data sync tab loading completes when sync status is loaded
    // (this is handled in the loadSyncStatusFromSettings callback)
  }

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

  loadSettingsTab() {
    console.log('Loading Settings tab...');
    // this.isSettingsTabLoading = true;

    // Load settings configuration
    this.loadSettingsConfig().then(() => {
      this.isSettingsTabLoading = false;
      console.log('Settings tab loaded');
    }).catch((error) => {
      console.error('Error loading settings tab:', error);
      this.isSettingsTabLoading = false;
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

  private async loadSettingsConfig(): Promise<void> {
    try {
      // Load settings configuration from API
      const config = await lastValueFrom(
        this.settingConfigService.getSettingsConfig(true) // Use cache
      );

      console.log('Settings configuration loaded:', config);

      // Simulate loading time for realistic UX
      // await new Promise(resolve => setTimeout(resolve, 800));

    } catch (error) {
      console.error('Error loading settings config:', error);
      throw error;
    }
  }

  loadSyncStatusFromSettings() {
    this.isLoadingSyncStatus = true;
    this.isLoadingFormSubmissionStatus = true;
    this.isInitialDataLoading = true;
    console.log('Loading sync status from API (includes form submission data)...');

    this.dataSyncService.getSyncStatus().subscribe({
      next: (response: any) => {
        this.isLoadingSyncStatus = false;
        this.isLoadingFormSubmissionStatus = false;
        this.isInitialDataLoading = false;
        this.isDataSyncTabLoading = false; // Complete data sync tab loading
        console.log('Sync status API response:', response);

        if (response?.data) {
          this.syncStatusFromSettings = response.data;

          // Also populate form submission status from the same API response
          this.formSubmissionStatus = {
            earliest_date: response.data.earliest_date,
            latest_date: response.data.latest_date,
            available_data_count: response.data.available_data_count || response.data.total_synced_data
          };

          // Initialize totalRecords from sync status data
          this.totalRecords = response.data.total_synced_data || response.data.available_data_count || 0;

          console.log('Sync status loaded from API:', this.syncStatusFromSettings);
          console.log('Form submission status populated:', this.formSubmissionStatus);
          console.log('Total records initialized:', this.totalRecords);
        } else {
          console.log('No sync status data in response, using default');
          // this.initializeDefaultSyncStatus();
        }
      },
      error: (error) => {
        this.isLoadingSyncStatus = false;
        this.isLoadingFormSubmissionStatus = false;
        this.isInitialDataLoading = false;
        this.isDataSyncTabLoading = false; // Complete data sync tab loading even on error
        console.error('Error loading sync status from API:', error);
        // this.initializeDefaultSyncStatus();
      }
    });
  }

  // private initializeDefaultSyncStatus() {
  //   // Set default sync status
  //   this.syncStatusFromSettings = {
  //     last_sync_date: null,
  //     last_sync_data_count: 0,
  //     total_synced_data: 0
  //   };

  //   // Set default form submission status
  //   this.formSubmissionStatus = {
  //     earliest_date: '',
  //     latest_date: '',
  //     available_data_count: 0
  //   };

  //   console.log('Default sync status initialized:', this.syncStatusFromSettings);
  //   console.log('Default form submission status initialized:', this.formSubmissionStatus);
  // }

  debugSyncStatus() {
    console.log('=== DEBUG SYNC STATUS ===');
    console.log('syncStatusFromSettings:', this.syncStatusFromSettings);
    console.log('formSubmissionStatus:', this.formSubmissionStatus);
    console.log('isLoadingSyncStatus:', this.isLoadingSyncStatus);
    console.log('Last sync date:', this.syncStatusFromSettings?.last_sync_date);
    console.log('Formatted date:', this.formatSyncDate(this.syncStatusFromSettings?.last_sync_date));
    console.log('========================');
  }

  debugProgressStatus() {
    console.log('=== DEBUG PROGRESS STATUS ===');
    console.log('isTaskRunning:', this.isTaskRunning);
    console.log('isDataSyncing:', this.isDataSyncing);
    console.log('totalRecords:', this.totalRecords);
    console.log('progress:', this.progress);
    console.log('elapsedTime:', this.elapsedTime);
    console.log('message:', this.message);
    console.log('WebSocket connected:', this.webSockettService ? 'Yes' : 'No');
    console.log('selectedTab:', this.selectedTab);
    console.log('syncStatusFromSettings:', this.syncStatusFromSettings);
    console.log('formSubmissionStatus:', this.formSubmissionStatus);
    console.log('==============================');
  }

  checkBackendSyncStatus() {
    console.log('Checking backend sync status...');
    this.dataSyncService.getSyncStatus().subscribe({
      next: (response: any) => {
        console.log('Backend sync status response:', response);
        if (response?.data) {
          console.log('Backend sync status:', response.data);
          console.log('Backend last sync date:', response.data.last_sync_date);
        } else {
          console.log('No sync status found in backend');
        }
      },
      error: (error) => {
        console.error('Error checking backend sync status:', error);
      }
    });
  }

  forceRefreshSyncStatus() {
    console.log('Force refreshing sync status...');
    // Clear current status
    this.syncStatusFromSettings = undefined;
    this.isLoadingSyncStatus = true;

    // Reload from backend
    setTimeout(() => {
      this.loadSyncStatusFromSettings();
    }, 500);
  }

  setTestSyncStatus() {
    console.log('Test sync status functionality removed - sync status is now updated automatically by backend');
    this.showError('Test sync status functionality has been removed - sync status is now automatic');
  }

  refreshAllStatus() {
    console.log('Refreshing all status data...');

    // Refresh data for the currently selected tab
    this.onTabSelected(this.selectedTab);

    console.log('Tab-specific refresh initiated for:', this.selectedTab);
  }

  updateTotalSyncedData(newTotal: number) {
    // This method is no longer needed - sync status is updated automatically by backend
    console.log('updateTotalSyncedData called but not needed - backend handles sync status automatically');
  }

  showSyncStatusUpdateSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3000,
    });
  }

  manualUpdateSyncStatus() {
    console.log('Manual update sync status functionality removed - sync status is now updated automatically by backend');
    this.showError('Manual update functionality has been removed - sync status is now automatic');
  }

  getSyncStatusSummary(): string {
    if (!this.syncStatusFromSettings) {
      return 'No sync status available';
    }

    const lastSync = this.formatSyncDate(this.syncStatusFromSettings.last_sync_date);
    const totalData = this.syncStatusFromSettings.total_synced_data || 0;
    const lastSyncCount = this.syncStatusFromSettings.last_sync_data_count || 0;

    return `Last sync: ${lastSync} | Total data: ${totalData} | Last sync records: ${lastSyncCount}`;
  }

  getSyncStatusDisplayText(): string {
    if (!this.syncStatusFromSettings?.last_sync_date) {
      return 'Never synced';
    }

    const lastSync = this.formatSyncDate(this.syncStatusFromSettings.last_sync_date);
    const lastSyncCount = this.syncStatusFromSettings.last_sync_data_count || 0;

    if (lastSyncCount > 0) {
      return `Last sync: ${lastSync} (${lastSyncCount} records)`;
    } else {
      return `Last sync: ${lastSync}`;
    }
  }

  getLastSyncDateType(): string {
    if (!this.syncStatusFromSettings?.last_sync_date) {
      return 'undefined';
    }
    return typeof this.syncStatusFromSettings.last_sync_date;
  }

  formatSyncDate(dateString: string | null | undefined): string {
    console.log('formatSyncDate called with:', dateString, 'type:', typeof dateString);

    if (!dateString) {
      console.log('No date string, returning "Never"');
      return 'Never';
    }

    try {
      const date = new Date(dateString);
      console.log('Parsed date:', date, 'isValid:', !isNaN(date.getTime()));

      if (isNaN(date.getTime())) {
        console.log('Invalid date, returning "Invalid Date"');
        return 'Invalid Date';
      }

      const formatted = date.toLocaleString();
      console.log('Formatted date:', formatted);
      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }

  onFileSelected(event: Event): void {
    this.fileErrors = '';
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type === 'text/csv') {
        this.selectedFile = file;
        this.parseCSV(this.selectedFile);
      } else {
        this.showError('Please select a CSV file.');
        this.isDataSyncing = false;
        this.resetFileInput();
      }
    }
  }

  parseCSV(file: File): void {
    this.isDataSyncing = true;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result: any) => {
        this.csvHeaders = result.meta.fields || [];
        this.checkHeaders();
      },
    });
  }

  checkHeaders(): void {
    this.mismatchedHeaders = this.requiredHeaders.filter(
      (header) =>
        !this.csvHeaders
          .map((h) => h.toLowerCase())
          .includes(header.toLowerCase())
    );

    this.mismatchedHeadersAdditinal = this.requiredHeadersAdditions.filter(
      (header) =>
        !this.csvHeaders
          .map((h) => h.toLowerCase())
          .includes(header.toLowerCase())
    );

    if (this.mismatchedHeaders.length > 0) {
      this.fileErrors = `Missing required headers: ${this.mismatchedHeaders.join(
        ', '
      )}`;
      this.showError(this.fileErrors);
      this.isDataSyncing = false;
      this.resetFileInput();
    } else {
      if (this.mismatchedHeadersAdditinal.length > 0) {
        this.openHeaderMap();
      } else {
        this.uploadFile();
      }
    }
  }

  resetFileInput(): void {
    this.fileInput.nativeElement.value = '';
    this.selectedFile = null;
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.showError('No file selected');
      this.isDataSyncing = false;
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('KEY', 'instanceid');

    this.isDataSyncing = true; // Show loading state

    this.dataSyncService.csvDataUpload(formData).subscribe({
      next: async (response: any) => {
        if (response?.data) {
          console.log('Upload successful:', response.data);

          // Sync status will be updated automatically by backend - no manual update needed

          this.showSuccess('File uploaded successfully');
        }
      },
      error: (error) => {
        console.error('Error uploading CSV:', error);
        this.resetFileInput();
        this.isDataSyncing = false;
        this.showError(
          error.error.detail || error.error.message || 'Failed to upload CSV'
        );
      },
      complete: () => {
        this.resetFileInput();
        this.loadSyncStatusFromSettings(); // Refresh sync status (includes form submission data)
        this.isDataSyncing = false; // Hide loading state
      },
    });
  }

  showSuccess(message: string): void {
    // Implement your success handling logic here
    console.log(message);
    alert(message); // Or use a more sophisticated success display mechanism
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

  async hasAccess(privileges: string[]) {
    return await lastValueFrom(this.authService.hasPrivilege(privileges));
  }
  // formsubmission_status method removed - data now comes from loadSyncStatusFromSettings()

  manualSync() {
    this.isDataSyncing = true; // Track only manual sync
    this.isSyncButtonLoading = true; // Show button loading state

    // Show sync starting message
    this.showSyncStatusUpdateSuccess('Manual sync starting...');

    // Refresh total records count before starting sync
    this.loadSyncStatusFromSettings();

    this.dataSyncService.syncData().subscribe({
      next: async (response: any) => {
        console.log('Manual sync initiated:', response);

        // Don't update sync status here - wait for completion
        // The sync status will be updated when WebSocket progress reaches 100%

        if (response.download_status === true) {
          this.isTaskRunning = true;
          this.showSyncStatusUpdateSuccess('Sync in progress... Monitoring via WebSocket');
        } else {
          // this.isTaskRunning = false;
        }

        this.isDataSyncing = false;
        this.isSyncButtonLoading = false; // Hide button loading state

        this.snackBar.open(
          `${response.status ?? response.status ?? 'Data sync initiated'}`,
          'Close',
          {
            horizontalPosition: 'end',
            verticalPosition: 'top',
            duration: 3000,
          }
        );
      },
      error: (error) => {
        console.error('Error during data sync:', error);
        this.isDataSyncing = false;
        this.isSyncButtonLoading = false; // Hide button loading state on error

        this.isTaskRunning = false;
        // this.triggersService.triggerCCVAListFunction();
        console.log(error.error.detail);
        this.snackBar.open(
          `${
            error.error.detail ?? error.error.message ?? 'Failed to data sync'
          }`,
          'Close',
          {
            horizontalPosition: 'end',
            verticalPosition: 'top',
            duration: 3000,
          }
        );
      },
    });
  }

  onCancel() {
    this.isTaskRunning = false;
    this.isSyncButtonLoading = false; // Reset button loading state when sync is cancelled

    // Show sync cancelled message
    this.showSyncStatusUpdateSuccess('Sync cancelled by user');

    // this.triggersService.triggerCCVAListFunction();
    // this.clearLocalStorage(); // Clear all task-related localStorage data
    this.webSockettService.disconnect();
    // clearInterval(this.countdownInterval);
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    // if (this.countdownInterval) {
    //   this.countdownInterval = false;
    // }
  }

  // Sync Questions function
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

  // WebSocket connection setup and message handling
  private initializeWebSocket(): void {
    this.webSockettService.connect(
      `${this.configService.API_URL_WS}/odk_progress/123`
    );

    this.messageSubscription = this.webSockettService.messages.subscribe(
      (data: string) => {
        try {
          const parsedData = JSON.parse(data);
          this.updateProgress(parsedData);
        } catch (error) {
          this.elapsedTime = null;
          console.error('Error parsing WebSocket message:', error);
        }
      }
    );
  }

  private updateProgress(parsedData: any): void {
    if (parsedData) {
      // this.isTaskRunning = true;
      this.totalRecords = parsedData.total_records;
      this.progress = Math.round(parsedData.progress).toFixed(0).toString();
      this.elapsedTime = parsedData.elapsed_time;
      this.message = JSON.stringify(parsedData);

      console.log('WebSocket progress update:', {
        total_records: parsedData.total_records,
        progress: parsedData.progress,
        elapsed_time: parsedData.elapsed_time
      });

      // Show progress updates
      if (parsedData.progress > 0 && parsedData.progress < 100) {
        this.showSyncStatusUpdateSuccess(`Sync progress: ${this.progress}% (${this.totalRecords} records)`);
      }

      // Check if sync is completed (progress = 100%)
      if (parsedData.progress >= 100) {
        console.log('Sync completed! Updating sync status...');

        // Sync status will be updated automatically by backend when sync completes
        console.log('Sync completed! Backend will update sync status automatically');
        this.showSyncStatusUpdateSuccess(`Data sync completed! ${this.totalRecords || 0} records synced.`);

        // Wait 1 second before hiding progress and showing normal interface
        setTimeout(() => {
          this.isTaskRunning = false;
          this.isSyncButtonLoading = false; // Reset button loading state when sync completes

          // Force refresh to show updated status from backend
          this.loadSyncStatusFromSettings();
        }, 1000);
      }

      // Store WebSocket progress data in localStorage with a TTL of 1 hour
      const odkProgressData = {
        totalRecords: this.totalRecords,
        progress: this.progress,
        elapsedTime: this.elapsedTime,
        message: this.message,
      };
      this.isTaskRunning = true;
      this.localStorageSettingsService.setItemWithTTL(
        'odk_progress',
        odkProgressData,
        1000 * 60 * 60 * 1
      ); // 1 hour
    }
  }

  // Load previous progress from localStorage (if exists and valid)
  private async loadPreviousProgressFromLocalStorage(): Promise<void> {
    const odkProgress =
      this.localStorageSettingsService.getItemWithTTL('odk_progress');
    if (odkProgress) {
      this.totalRecords = odkProgress.totalRecords;
      this.progress = odkProgress.progress;
      this.elapsedTime = odkProgress.elapsedTime;
      this.message = odkProgress.message;
    }
  }

  ngOnDestroy() {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    this.webSockettService.disconnect();
  }

  onForceCheck(e: Event, notAllowed?: boolean) {
    this.forceChecked = notAllowed
      ? this.forceChecked
      : (e?.target as HTMLInputElement).checked;
  }

  // Clean up subscriptions and WebSocket connections
  private cleanUp(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    this.webSockettService.disconnect();
  }

  openHeaderMap() {
    const dialogRef = this.dialog.open(HeaderMappingModalComponent, {
      data: {
        mismatchedHeaders: this.mismatchedHeadersAdditinal,
        csvHeaders: this.csvHeaders,
        requiredHeaders: this.requiredHeadersAdditions,
      },
    });

    dialogRef
      .afterClosed()
      .subscribe((mappedHeaders: { [key: string]: string }) => {
        if (
          Object.keys(mappedHeaders).length ===
          this.requiredHeadersAdditions.length
        ) {
          this.updateCsvHeaders(mappedHeaders);
          this.uploadFile();
        } else {
          this.showError('Header mapping is incomplete. Please try again.');
          this.isDataSyncing = false;
          this.resetFileInput();
        }
      });
  }

  updateCsvHeaders(mappedHeaders: { [key: string]: string }) {
    const newHeaders = [...this.csvHeaders];
    Object.entries(mappedHeaders).forEach(([requiredHeader, csvHeader]) => {
      const index = newHeaders.findIndex(
        (h) => h.toLowerCase() === csvHeader.toLowerCase()
      );
      if (index !== -1) {
        newHeaders[index] = requiredHeader;
      }
    });

    // Create a new CSV with updated headers
    const newCsvData = this.csvData.map((row) => {
      const newRow: any = {};
      this.csvHeaders.forEach((oldHeader, index) => {
        newRow[newHeaders[index]] = row[oldHeader];
      });
      return newRow;
    });

    const newCsv = Papa.unparse(newCsvData);

    // Create a new File object with the updated CSV content
    this.selectedFile = new File([newCsv], this.selectedFile!.name, {
      type: 'text/csv',
    });

    // Update the csvHeaders with the new headers
    this.csvHeaders = newHeaders;
  }

  getDataRangeText(): string {
    if (!this.formSubmissionStatus?.earliest_date || !this.formSubmissionStatus?.latest_date) {
      return 'No data range';
    }

    const earliest = new Date(this.formSubmissionStatus.earliest_date);
    const latest = new Date(this.formSubmissionStatus.latest_date);
    const daysDiff = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 3600 * 24));

    if (daysDiff <= 1) {
      return '1 day';
    } else if (daysDiff <= 30) {
      return `${daysDiff} days`;
    } else if (daysDiff <= 365) {
      const months = Math.ceil(daysDiff / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(daysDiff / 365);
      const remainingMonths = Math.ceil((daysDiff % 365) / 30);
      if (remainingMonths > 0) {
        return `${years}y ${remainingMonths}m`;
      }
      return `${years} year${years > 1 ? 's' : ''}`;
    }
  }

}
