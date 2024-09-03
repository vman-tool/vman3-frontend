// import { WebsocketService } from './../../services/web-socket.service';
import { DataSyncService } from './../../services/data_sync.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { catchError, lastValueFrom, map, retry, Subscription, throwError } from 'rxjs';
import { WebSockettService } from '../../services/web-socket.service';
import { ConfigService } from '../../../../app.service';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { VaRecordsService } from 'app/modules/pcva/services/va-records/va-records.service';

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

  constructor(
    private dataSyncService: DataSyncService,
    private configService: ConfigService,
    private webSockettService: WebSockettService,
    private indexedDBService: IndexedDBService,
    private vaRecordsService: VaRecordsService,
  ) {
    // this.dataSyncService.webSocket$
    //   .pipe(
    //     catchError((error) => {
    //       // this.interval = 1;
    //       return throwError(() => new Error(error));
    //     }),
    //     retry({ delay: 5_000 }),
    //     // takeUntilDestroyed()
    //   )
    //   .subscribe((data: any) => {
    //     if (data) {
    //       this.totalRecords = data.total_records;
    //       this.progress = data.progress;
    //       this.elapsedTime = data.elapsed_time;
    //     }
    //   });
  }
  // initializeSocketConnection() {
  //   this.websocketService.connect('');
  //   this.websocketService.onMessage().subscribe((message: any) => {
  //     console.log('Received message:', message);
  //     //  this.messages.push(message);
  //   });
  // }
  async ngOnInit(): Promise<void> {
    this.webSockettService.connect(
      `${this.configService.API_URL_WS}/odk_progress/123`
    );
    this.messageSubscription = this.webSockettService.messages.subscribe(
      (data: string) => {
        try {
          // Parse the incoming message string to JSON
          const parsedData = JSON.parse(data);

          console.log('Received message:', parsedData);

          // Update component properties with parsed data
          if (parsedData) {
            this.totalRecords = parsedData.total_records;
            this.progress = Math.round(parsedData.progress)
              .toFixed(0)
              .toString();
            this.elapsedTime = parsedData.elapsed_time;
          }

          this.message = data; // Keep the raw message as a string
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
    );
    // this.initializeSocketConnection();

    // this.progressSub = this.dataSyncService
    //   .getSyncProgress()
    //   .subscribe((data) => {
    //     if (data) {
    //       this.totalRecords = data.total_records;
    //       this.progress = data.progress;
    //       this.elapsedTime = data.elapsed_time;
    //     }
    //   });
    this.syncedQuestions = await this.indexedDBService.getQuestions()
    
    if(!this.syncedQuestions?.length) {
      await lastValueFrom(this.vaRecordsService.getQuestions().pipe(
        map(async (response: any) => {
          await this.indexedDBService.deleteObjectStore()
          await this.indexedDBService.initDB()

          this.indexedDBService.addQuestions(response?.data);
          this.indexedDBService.addQuestionsAsObject(response?.data);
          this.syncedQuestions = await this.indexedDBService.getQuestions()
        })
      ))
    }
  }
  sendMessage() {
    this.webSockettService.sendMessage('Hello, server!');
  }

  ngOnDestroy() {
    // Clean up the subscription
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }

    // Disconnect the WebSocket when the component is destroyed
    this.webSockettService.disconnect();
  }

  manualSync() {
    this.dataSyncService.syncData().subscribe(
      {
        next: (response: any) => {
          console.log('Manual sync initiated:', response);
        },
        error: (error: any) => {
          console.error('Error during manual sync:', error);
        }
      }
    );
  }

  onSyncQuestions(){
    this.syncedQuestions = undefined;
    this.dataSyncService.syncQuestions().pipe(
      map(async (response: any) => {
        this.indexedDBService.addQuestions(response?.data);
        this.indexedDBService.addQuestionsAsObject(response?.data);
        this.syncedQuestions = await this.indexedDBService.getQuestions()
      })
    ).subscribe()
  }
}
