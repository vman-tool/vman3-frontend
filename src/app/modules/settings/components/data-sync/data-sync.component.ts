import { DataSyncService } from './../../services/data_sync.service';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { lastValueFrom, map, Subscription } from 'rxjs';
import { DatePipe } from '@angular/common';
import { WebSockettService } from '../../services/web-socket.service';
import { ConfigService } from '../../../../app.service';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { LocalStorageSettingsService } from '../../services/local_storage.service';
import * as privileges from 'app/shared/constants/privileges.constants';
import { AuthService } from 'app/core/services/authentication/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as Papa from 'papaparse';
import { MatDialog } from '@angular/material/dialog';
import { HeaderMappingModalComponent } from '../../dialogs/header-mapping/header-mapping.component';
import { RunCcvaService } from '../../../ccva/services/run-ccva.service';
import { SettingConfigService } from '../../services/settings_configs.service';
@Component({
  standalone: false,
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
  // Client-side ticker — increments every second for smooth display
  displayElapsedSec = 0;
  recordsProcessed = 0;
  serverTotal = 0;   // total records on ODK server
  localCount = 0;    // records already in local DB before this sync
  private elapsedTicker: ReturnType<typeof setInterval> | null = null;
  // Fires if no WS message arrives after restoring a running task from localStorage,
  // meaning the task finished while the user was away.
  private wsInactivityTimer: ReturnType<typeof setTimeout> | null = null;
  // Set while a cancel request has been sent but the "cancelled" WS ack hasn't arrived yet
  isCancelling = false;
  private cancelFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  isTaskRunning = false;
  isDataSyncing = false;
  isLoadingFormSubmissionStatus = false;
  // Independent loading states for each tab
  isDataSyncTabLoading: boolean = false; // For Data Synchronization tab
  isSettingsTabLoading: boolean = false; // For Settings tab
  isSyncButtonLoading: boolean = false;
  isInitialDataLoading: boolean = false;

  // syncedQuestions?: any[] = [];
  // forceChecked: boolean = false;
  dataSyncAccess?: any;
  csvData: any[] = [];
  private progressSub: Subscription | null = null;
  message: string | undefined;
  private messageSubscription: Subscription | undefined;
  private currentTaskId: string = '';   // set from API response; never hardcoded
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

  syncHistory: any[] = [];
  isLoadingHistory = false;

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
    // private genericIndexedDbService: GenericIndexedDbService,
    // private vaRecordsService: VaRecordsService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private runCcvaService: RunCcvaService,
    private settingConfigService: SettingConfigService,
    private datePipe: DatePipe
  ) { }

  async ngOnInit(): Promise<void> {
    console.log('DataSyncComponent ngOnInit started');
    this.elapsedTime = null;

    await this.loadPreviousProgressFromLocalStorage();
    // Connect to the channel for the task that was running (if any), or skip
    // until a new sync starts and gives us a real task_id.
    if (this.currentTaskId) {
      this.connectWebSocket(this.currentTaskId);
    }

    // Load permissions
    // Load permissions
    this.dataSyncAccess = {
      canSyncODKData: await this.hasAccess([privileges.ODK_DATA_SYNC]),
      // canSyncODKQuestions: await this.hasAccess([
      //   privileges.ODK_QUESTIONS_SYNC,
      // ]),
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
      // case 'questions-sync':
      //   this.loadQuestionsSyncTab();
      //   break;
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
    this.loadSyncHistory();

    // Data sync tab loading completes when sync status is loaded
    // (this is handled in the loadSyncStatusFromSettings callback)
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
    // console.log('formatSyncDate called with:', dateString, 'type:', typeof dateString);

    if (!dateString) {
      console.log('No date string, returning "Never"');
      return 'Never';
    }

    try {
      const date = new Date(dateString);
      // console.log('Parsed date:', date, 'isValid:', !isNaN(date.getTime()));

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

  async hasAccess(privileges: string[]) {
    return await lastValueFrom(this.authService.hasPrivilege(privileges));
  }
  // formsubmission_status method removed - data now comes from loadSyncStatusFromSettings()

  manualSync() {
    this.isDataSyncing = true;
    this.isSyncButtonLoading = true;
    // Reset completion state so the guard doesn't block the new sync's messages
    this.serverTotal = 0;
    this.localCount = 0;
    this.recordsProcessed = 0;
    this.progress = '0';
    this.displayElapsedSec = 0;

    // Show sync starting message
    this.showSyncStatusUpdateSuccess('Manual sync starting...');

    // Refresh total records count before starting sync
    this.loadSyncStatusFromSettings();

    this.dataSyncService.syncData().subscribe({
      next: async (response: any) => {
        console.log('Manual sync initiated:', response);

        if (response.download_status === true && response.task_id) {
          // Connect WebSocket to this specific task's progress channel
          this.connectWebSocket(response.task_id);
          this.isTaskRunning = true;
          this.showSyncStatusUpdateSuccess('Sync in progress... Monitoring via WebSocket');
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
          `${error.error.detail ?? error.error.message ?? 'Failed to data sync'
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
    if (this.isCancelling) return;
    this.isCancelling = true;

    this.dataSyncService.cancelSync().subscribe({
      next: () => {
        // Immediately clear the running UI — don't wait for the WS "cancelled"
        // message.  isCancelling=true blocks any incoming "running" WS messages
        // from re-enabling isTaskRunning until the "cancelled" ack arrives.
        this.clearElapsedTicker();
        this.clearWsInactivityTimer();
        this.isTaskRunning = false;
        this.isSyncButtonLoading = false;
        this.localStorageSettingsService.removeItem('odk_progress');

        // 30 s fallback: if the "cancelled" WS message never arrives (e.g. task
        // already finished before the flag was checked), reset state and reload.
        this.clearCancelFallbackTimer();
        this.cancelFallbackTimer = setTimeout(() => {
          this.isCancelling = false;
          this.loadSyncStatusFromSettings();
          this.loadSyncHistory();
        }, 30000);
      },
      error: () => {
        this.clearElapsedTicker();
        this.clearWsInactivityTimer();
        this.isTaskRunning = false;
        this.isSyncButtonLoading = false;
        this.isCancelling = false;
        this.localStorageSettingsService.removeItem('odk_progress');
      },
    });
  }



  // WebSocket connection — always keyed to the specific task_id
  private connectWebSocket(taskId: string): void {
    this.webSockettService.disconnect();
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
      this.messageSubscription = undefined;
    }
    this.currentTaskId = taskId;
    this.webSockettService.connect(
      `${this.configService.API_URL_WS}/odk_progress/${taskId}`
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
    if (!parsedData) return;

    // Cancel inactivity timer — a live message has arrived
    this.clearWsInactivityTimer();

    // Ignore intermediate progress while cancellation is in progress.
    // Only let terminal status messages (cancelled/completed/error) through.
    if (this.isCancelling && parsedData.status === 'running') return;

    this.totalRecords = parsedData.total_records;
    this.progress = Math.round(parsedData.progress).toFixed(0).toString();
    this.elapsedTime = parsedData.elapsed_time ?? null;
    this.recordsProcessed = parsedData.records_processed ?? 0;
    this.message = JSON.stringify(parsedData);

    if (parsedData.server_total != null) this.serverTotal = parsedData.server_total;
    if (parsedData.local_count != null) this.localCount = parsedData.local_count;

    // Sync client-side ticker to authoritative server elapsed time
    if (parsedData.elapsed_time != null) {
      this.displayElapsedSec = Math.round(parsedData.elapsed_time);
    }

    // Start client-side ticker on first non-complete message
    if (!this.elapsedTicker && parsedData.status !== 'completed' && parsedData.status !== 'error') {
      this.startElapsedTicker();
    }

    // Sync completed
    if (parsedData.progress >= 100 || parsedData.status === 'completed') {
      // Guard: already handled AND no pending cancel to acknowledge
      if (!this.isTaskRunning && !this.isCancelling) return;
      this.clearElapsedTicker();
      this.clearWsInactivityTimer();
      this.clearCancelFallbackTimer();
      this.isTaskRunning = false;
      this.isSyncButtonLoading = false;
      this.isCancelling = false;
      this.localStorageSettingsService.removeItem('odk_progress');
      this.showSyncStatusUpdateSuccess(
        `Sync completed — ${(this.recordsProcessed ?? 0).toLocaleString()} new records synced.`
      );
      setTimeout(() => {
        this.loadSyncStatusFromSettings();
        this.loadSyncHistory();
      }, 1500);
      return;
    }

    // Sync cancelled by user
    if (parsedData.status === 'cancelled') {
      this.clearElapsedTicker();
      this.clearWsInactivityTimer();
      this.clearCancelFallbackTimer();
      this.isTaskRunning = false;
      this.isSyncButtonLoading = false;
      this.isCancelling = false;
      this.localStorageSettingsService.removeItem('odk_progress');
      this.showSyncStatusUpdateSuccess(
        `Sync cancelled — ${(this.recordsProcessed ?? 0).toLocaleString()} records were saved.`
      );
      setTimeout(() => {
        this.loadSyncStatusFromSettings();
        this.loadSyncHistory();
      }, 1000);
      return;
    }

    // Sync errored
    if (parsedData.status === 'error') {
      if (!this.isTaskRunning) return;
      this.clearElapsedTicker();
      this.clearWsInactivityTimer();
      this.isTaskRunning = false;
      this.isSyncButtonLoading = false;
      this.isCancelling = false;
      this.localStorageSettingsService.removeItem('odk_progress');
      return;
    }

    this.isTaskRunning = true;

    this.localStorageSettingsService.setItemWithTTL(
      'odk_progress',
      {
        taskId: this.currentTaskId,
        totalRecords: this.totalRecords,
        progress: this.progress,
        elapsedTime: this.elapsedTime,
        recordsProcessed: this.recordsProcessed,
        serverTotal: this.serverTotal,
        localCount: this.localCount,
        message: this.message,
      },
      1000 * 60 * 60
    );
  }

  private async loadPreviousProgressFromLocalStorage(): Promise<void> {
    const odkProgress = this.localStorageSettingsService.getItemWithTTL('odk_progress');
    if (odkProgress) {
      this.currentTaskId = odkProgress.taskId ?? '';
      this.totalRecords = odkProgress.totalRecords;
      this.progress = odkProgress.progress;
      this.elapsedTime = odkProgress.elapsedTime ?? null;
      this.recordsProcessed = odkProgress.recordsProcessed ?? 0;
      this.displayElapsedSec = Math.round(odkProgress.elapsedTime ?? 0);
      this.serverTotal = odkProgress.serverTotal ?? 0;
      this.localCount = odkProgress.localCount ?? 0;
      this.message = odkProgress.message;
      const pct = parseInt(odkProgress.progress ?? '0', 10);
      if (pct > 0 && pct < 100) {
        this.isTaskRunning = true;
        this.startElapsedTicker();
        // If the task finished while the user was away, no WS messages will
        // arrive.  After 15 s with no activity, treat the sync as done.
        this.startWsInactivityTimer();
      }
    }
  }

  ngOnDestroy() {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    this.clearElapsedTicker();
    this.clearWsInactivityTimer();
    this.clearCancelFallbackTimer();
    this.webSockettService.disconnect();
  }

  // ── Smooth elapsed-time ticker ──────────────────────────────────────────

  private startElapsedTicker(): void {
    this.clearElapsedTicker();
    this.elapsedTicker = setInterval(() => { this.displayElapsedSec++; }, 1000);
  }

  private clearElapsedTicker(): void {
    if (this.elapsedTicker) {
      clearInterval(this.elapsedTicker);
      this.elapsedTicker = null;
    }
  }

  private startWsInactivityTimer(): void {
    this.clearWsInactivityTimer();
    // If no WS message arrives within 15 s the task has already finished
    this.wsInactivityTimer = setTimeout(() => {
      if (this.isTaskRunning) {
        this.isTaskRunning = false;
        this.isSyncButtonLoading = false;
        this.clearElapsedTicker();
        this.localStorageSettingsService.removeItem('odk_progress');
        this.loadSyncStatusFromSettings();
        this.loadSyncHistory();
      }
    }, 15000);
  }

  private clearWsInactivityTimer(): void {
    if (this.wsInactivityTimer) {
      clearTimeout(this.wsInactivityTimer);
      this.wsInactivityTimer = null;
    }
  }

  private clearCancelFallbackTimer(): void {
    if (this.cancelFallbackTimer) {
      clearTimeout(this.cancelFallbackTimer);
      this.cancelFallbackTimer = null;
    }
  }

  // ── Derived progress helpers ────────────────────────────────────────────

  get recordsPerSecond(): number {
    if (!this.displayElapsedSec || !this.recordsProcessed) return 0;
    return this.recordsProcessed / this.displayElapsedSec;
  }

  get estimatedSecondsRemaining(): number | null {
    const pct = parseFloat(this.progress ?? '0');
    const rps = this.recordsPerSecond;
    if (pct <= 0 || pct >= 100 || !rps) return null;
    return Math.round(((this.totalRecords ?? 0) * (1 - pct / 100)) / rps);
  }

  fmtDuration(sec: number): string {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
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

  loadSyncHistory(): void {
    this.isLoadingHistory = true;
    this.dataSyncService.getSyncHistory(20).subscribe({
      next: (response: any) => {
        this.syncHistory = response?.data ?? [];
        this.isLoadingHistory = false;
      },
      error: () => {
        this.syncHistory = [];
        this.isLoadingHistory = false;
      },
    });
  }

  fmtHistoryDuration(sec: number): string {
    if (!sec || sec < 1) return '< 1s';
    if (sec < 60) return `${Math.round(sec)}s`;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
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
