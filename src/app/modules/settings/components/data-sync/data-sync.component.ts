// import { WebsocketService } from './../../services/web-socket.service';
import { DataSyncService } from './../../services/data_sync.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { catchError, retry, Subscription, throwError } from 'rxjs';
import { WebSockettService } from '../../services/t';

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

  constructor(
    private dataSyncService: DataSyncService,
    // private websocketService: WebsocketService,
    private webSockettService: WebSockettService
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
  ngOnInit(): void {
    this.webSockettService.connect('ws://localhost:8080/ws');
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
      (response: any) => {
        console.log('Manual sync initiated:', response);
      },
      (error: any) => {
        console.error('Error during manual sync:', error);
      }
    );
  }
}
