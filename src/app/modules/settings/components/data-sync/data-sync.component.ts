// import { WebsocketService } from './../../services/web-socket.service';
import { DataSyncService } from './../../services/data_sync.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { lastValueFrom, map, Subscription } from 'rxjs';
import { WebSockettService } from '../../services/web-socket.service';
import { ConfigService } from '../../../../app.service';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { VaRecordsService } from 'app/modules/pcva/services/va-records/va-records.service';
import { LocalStorageSettingsService } from '../../services/local_storage.service';

@Component({
  selector: 'app-data-sync',
  // standalone: true,
  // imports: [],
  templateUrl: './data-sync.component.html',
  styleUrl: './data-sync.component.scss',
})
export class DataSyncComponent implements OnInit, OnDestroy {
  totalRecords: number | null = null;
  progress: string | null = null;
  elapsedTime: number | null = null;

  private progressSub: Subscription | null = null;
  message: string | undefined;
  private messageSubscription: Subscription | undefined;

  syncedQuestions?: any[] = [];
  forceChecked: boolean = false;

  constructor(
    private dataSyncService: DataSyncService,
    private localStorageSettingsService: LocalStorageSettingsService,
    private configService: ConfigService,
    private webSockettService: WebSockettService,
    private indexedDBService: IndexedDBService,
    private vaRecordsService: VaRecordsService
  ) {}
  async ngOnInit(): Promise<void> {
    console.log('DataSyncComponent initialized');
    await this.loadPreviousProgressFromLocalStorage();
    this.initializeWebSocket();

    // await this.syncQuestionsIfNeeded();
    this.syncedQuestions = await this.indexedDBService.getQuestions();

    if (!this.syncedQuestions?.length) {
      await lastValueFrom(
        this.vaRecordsService.getQuestions().pipe(
          map(async (response: any) => {
            await this.indexedDBService.addQuestions(response?.data);
            await this.indexedDBService.addQuestionsAsObject(response?.data);
            this.syncedQuestions = await this.indexedDBService.getQuestions();
          })
        )
      );
    }
  }
  // async ngOnInit(): Promise<void> {
  //   this.webSockettService.connect(
  //     `${this.configService.API_URL_WS}/odk_progress/123`
  //   );
  //   var odk_progress =
  //     this.localStorageSettingsService.getItemWithTTL('odk_progress');
  //   if (odk_progress) {
  //     // this.localStorageSettingsService.removeItem('odk_progress');
  //   }
  //   this.messageSubscription = this.webSockettService.messages.subscribe(
  //     (data: string) => {
  //       try {
  //         // Parse the incoming message string to JSON
  //         const parsedData = JSON.parse(data);

  //         console.log('Received message:', parsedData);

  //         // Update component properties with parsed data
  //         if (parsedData) {
  //           this.totalRecords = parsedData.total_records;
  //           this.progress = Math.round(parsedData.progress)
  //             .toFixed(0)
  //             .toString();
  //           this.elapsedTime = parsedData.elapsed_time;
  //         }

  //         this.message = data; // Keep the raw message as a string
  //       } catch (error) {
  //         console.error('Error parsing message:', error);
  //       }
  //     }
  //   );

  //   this.syncedQuestions = await this.indexedDBService.getQuestions();

  //   if (!this.syncedQuestions?.length) {
  //     await lastValueFrom(
  //       this.vaRecordsService.getQuestions().pipe(
  //         map(async (response: any) => {
  //           await this.indexedDBService.addQuestions(response?.data);
  //           await this.indexedDBService.addQuestionsAsObject(response?.data);
  //           this.syncedQuestions = await this.indexedDBService.getQuestions();
  //         })
  //       )
  //     );
  //   }
  // }
  // Handle and update progress from WebSocket message, and save to localStorage

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
          console.error('Error parsing WebSocket message:', error);
        }
      }
    );
  }
  private updateProgress(parsedData: any): void {
    if (parsedData) {
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
    console.log('odkProgress:', odkProgress);
    if (odkProgress) {
      this.totalRecords = odkProgress.totalRecords;
      this.progress = odkProgress.progress;
      this.elapsedTime = odkProgress.elapsedTime;
      this.message = odkProgress.message;
    }
  }

  ngOnDestroy() {
    // // Clean up the subscription
    // if (this.messageSubscription) {
    //   this.messageSubscription.unsubscribe();
    // }

    // // Disconnect the WebSocket when the component is destroyed
    // this.webSockettService.disconnect();
    this.cleanUp();
  }

  manualSync() {
    this.dataSyncService.syncData().subscribe({
      next: (response: any) => {
        console.log('Manual sync initiated:', response);
      },
      error: (error: any) => {
        console.error('Error during manual sync:', error);
      },
    });
  }

  onForceCheck(e: Event, notAllowed?: boolean) {
    this.forceChecked = notAllowed
      ? this.forceChecked
      : (e?.target as HTMLInputElement).checked;
  }

  async onSyncQuestions() {
    this.syncedQuestions = undefined;

    if (!this.forceChecked) {
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

    this.syncedQuestions = !this.syncedQuestions?.length
      ? undefined
      : this.syncedQuestions;

    if (!this.syncedQuestions) {
      this.syncedQuestions = await lastValueFrom(
        this.dataSyncService.syncQuestions().pipe(
          map(async (response: any) => {
            await this.indexedDBService.addQuestions(response?.data);
            await this.indexedDBService.addQuestionsAsObject(response?.data);
            this.forceChecked = !this.forceChecked;
            return await this.indexedDBService.getQuestions();
          })
        )
      );
    }
  }

  // Clean up subscriptions and WebSocket connections
  private cleanUp(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    this.webSockettService.disconnect();
  }
}
