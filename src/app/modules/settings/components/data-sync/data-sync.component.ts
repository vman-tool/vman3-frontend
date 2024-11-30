import { DataSyncService } from './../../services/data_sync.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { lastValueFrom, map, Subscription } from 'rxjs';
import { WebSockettService } from '../../services/web-socket.service';
import { ConfigService } from '../../../../app.service';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { VaRecordsService } from 'app/modules/pcva/services/va-records/va-records.service';
import { LocalStorageSettingsService } from '../../services/local_storage.service';
import * as privileges from 'app/shared/constants/privileges.constants';
import { AuthService } from 'app/core/services/authentication/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-data-sync',
  templateUrl: './data-sync.component.html',
  styleUrl: './data-sync.component.scss',
})
export class DataSyncComponent implements OnInit, OnDestroy {
  totalRecords: number | null = null;
  progress: string | null = null;
  formSubmissionStatus:
    | {
        earliest_date: string;
        latest_date: string;
        available_data_count: number;
      }
    | undefined;
  elapsedTime: number | null = null;
  isTaskRunning = false;
  isDataSyncing = false;
  isLoadingFormSubmissionStatus = false;
  // Separate sync flags

  isQuestionsSyncing: boolean = false; // For syncing questions

  syncedQuestions?: any[] = [];
  forceChecked: boolean = false;
  dataSyncAccess?: any;

  private progressSub: Subscription | null = null;
  message: string | undefined;
  private messageSubscription: Subscription | undefined;

  constructor(
    private dataSyncService: DataSyncService,
    private localStorageSettingsService: LocalStorageSettingsService,
    private configService: ConfigService,
    private webSockettService: WebSockettService,
    private indexedDBService: IndexedDBService,
    private vaRecordsService: VaRecordsService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit(): Promise<void> {
    this.elapsedTime = null;
    await this.loadPreviousProgressFromLocalStorage();
    this.formsubmission_status();
    this.initializeWebSocket();

    this.syncedQuestions = await this.indexedDBService.getQuestions();
    if (!this.syncedQuestions?.length) {
      await this.syncQuestionsIfNeeded();
    }

    this.dataSyncAccess = {
      canSyncODKData: await this.hasAccess([privileges.ODK_DATA_SYNC]),
      canSyncODKQuestions: await this.hasAccess([
        privileges.ODK_QUESTIONS_SYNC,
      ]),
    };
  }

  async syncQuestionsIfNeeded() {
    this.isQuestionsSyncing = true;

    this.syncedQuestions = await this.indexedDBService.getQuestions();

    if (!this.syncedQuestions?.length) {
      console.log('No synced questions found, starting sync...');
      this.syncedQuestions = await lastValueFrom(
        this.vaRecordsService.getQuestions().pipe(
          map(async (response: any) => {
            if (response?.data) {
              await this.indexedDBService.addQuestions(response?.data);
              await this.indexedDBService.addQuestionsAsObject(response?.data);
              return await this.indexedDBService.getQuestions();
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
  formsubmission_status() {
    this.isLoadingFormSubmissionStatus = true;

    this.dataSyncService.formsubmission_status().subscribe({
      next: (response: any) => {
        this.isLoadingFormSubmissionStatus = false;
        this.formSubmissionStatus = {
          earliest_date: response.earliest_date,
          latest_date: response.latest_date,
          available_data_count: response.available_data_count,
        };
      },
      error: (error) => {
        console.error('Error during data sync:', error);
        this.isDataSyncing = false;
        this.isDataSyncing = false;
        this.isTaskRunning = false;
        this.isLoadingFormSubmissionStatus = false;
        this.isTaskRunning = false;
        // this.triggersService.triggerCCVAListFunction();
        console.log(error);
        this.snackBar.open(
          `${
            error?.error?.detail ?? error.error.message ?? 'Failed to data sync'
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

  manualSync() {
    this.isDataSyncing = true; // Track only manual sync

    this.dataSyncService.syncData().subscribe({
      next: (response: any) => {
        console.log('Manual sync initiated:', response);
        if (response.download_status === true) {
          this.isTaskRunning = true;
        } else {
          // this.isTaskRunning = false;
        }

        this.isDataSyncing = false;

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
        this.isDataSyncing = false;
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
    // this.triggersService.triggerCCVAListFunction();
    // this.clearLocalStorage(); // Clear all task-related localStorage data
    this.webSockettService.disconnect();
    // clearInterval(this.countdownInterval);
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    // if (this.countdownInterval) {
    //   this.countdownInterval = null;
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
              await this.indexedDBService.addQuestions(response?.data);
              return await this.indexedDBService.getQuestions();
            }
          })
        )
      );
    }

    if (!this.syncedQuestions) {
      this.syncedQuestions = await lastValueFrom(
        this.dataSyncService.syncQuestions().pipe(
          map(async (response: any) => {
            await this.indexedDBService.addQuestions(response?.data);
            this.forceChecked = !this.forceChecked;
            return await this.indexedDBService.getQuestions();
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
          console.log(data)
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
}
