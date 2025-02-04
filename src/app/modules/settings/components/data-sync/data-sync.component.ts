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
    private runCcvaService: RunCcvaService
  ) {}

  async ngOnInit(): Promise<void> {
    this.elapsedTime = null;
    await this.loadPreviousProgressFromLocalStorage();
    this.formsubmission_status();
    this.initializeWebSocket();

    // this.syncedQuestions = await this.indexedDBService.getQuestions();
    this.syncedQuestions = await this.genericIndexedDbService.getData(
      OBJECTSTORE_VA_QUESTIONS
    );
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type === 'text/csv') {
        this.selectedFile = file;
        this.parseCSV(this.selectedFile);
      } else {
        this.showError('Please select a CSV file.');
        this.resetFileInput();
      }
    }
  }

  parseCSV(file: File): void {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
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
      duration: 3000,
    });
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.showError('No file selected');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('KEY', 'instanceid');

    this.isDataSyncing = true; // Show loading state

    this.dataSyncService.csvDataUpload(formData).subscribe({
      next: (response: any) => {
        if (response?.data) {
          console.log('Upload successful:', response.data);
          this.showSuccess('File uploaded successfully');
        }
      },
      error: (error) => {
        console.error('Error uploading CSV:', error);
        this.showError(
          error.error.detail || error.error.message || 'Failed to upload CSV'
        );
      },
      complete: () => {
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
}
