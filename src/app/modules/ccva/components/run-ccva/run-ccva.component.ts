// import { Component, OnInit } from '@angular/core';
// import { RunCcvaService } from '../../services/run-ccva.service';
// import { ConfigService } from 'app/app.service';

// @Component({
//   selector: 'app-run-ccva',
//   templateUrl: './run-ccva.component.html',
//   styleUrl: './run-ccva.component.scss',
// })
// export class RunCcvaComponent implements OnInit {
//   constructor(
//     private configService: ConfigService,
//     private runCcvaService: RunCcvaService
//   ) {}

//   data?: any;
//   progress: number = 0;
//   totalRecords: number = 0;
//   elapsedTime: number = 0;
//   isTaskRunning: boolean = false; // Tracks whether a task is running
//   taskIdKey?: string; // Do not initialize with a value

//   ngOnInit(): void {
//     if (this.taskIdKey) {
//       // Check if a taskId is stored in localStorage
//       const storedTaskId = localStorage.getItem(this.taskIdKey);
//       if (storedTaskId) {
//         this.isTaskRunning = true;
//         this.connectToEventSource(storedTaskId);
//       }
//     }
//   }

//   onRunCCVA() {
//     this.runCcvaService.run_ccva().subscribe({
//       next: (response: any) => {
//         if (response?.data) {
//           const taskId = response.data.task_id;
//           localStorage.setItem(this.taskIdKey!, taskId);
//           this.connectToEventSource(taskId);
//         }
//       },
//       error: (error) => {
//         console.error('Error starting CCVA task:', error);
//         this.isTaskRunning = false; // Reset if there's an error
//       },
//     });
//   }
//   connectToEventSource(taskId: string) {
//     if (!taskId) {
//       console.error('No taskId provided');
//       return;
//     }

//     const eventSource = new EventSource(
//       `${this.configService.API_URL}/ccva/events/${taskId}`
//     );

//     eventSource.onmessage = (event) => {
//       var eventData = JSON.parse(event.data);
//       // data = JSON.parse(event.data);
//       if (eventData.status === 'completed') {
//         console.log('Task Completed: ', eventData);
//         console.log('Task Completed: ', eventData);
//         this.data = eventData;
//         this.progress = 100;
//         this.isTaskRunning = false; // Mark task as completed
//         eventSource.close();
//         if (this.taskIdKey) {
//           localStorage.removeItem(this.taskIdKey);
//         }
//       } else if (eventData.error === true) {
//         console.log('Task Failed: ', eventData);
//         eventSource.close();
//       } else {
//         console.log('Task Running: ', eventData);
//         this.data = eventData;
//         this.progress = 100;
//         this.isTaskRunning = true; // Mark task as completed
//       }
//     };
//     eventSource.onerror = (error) => {
//       console.log('EventSource error:', error);
//       this.isTaskRunning = false; // Reset if there's an error
//       eventSource.close();
//     };
//   }
// }

import { Component, OnInit } from '@angular/core';
import { RunCcvaService } from '../../services/run-ccva.service';
import { ConfigService } from 'app/app.service';
import { WebSockettService } from '../../../settings/services/web-socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-run-ccva',
  templateUrl: './run-ccva.component.html',
  styleUrls: ['./run-ccva.component.scss'],
})
export class RunCcvaComponent implements OnInit {
  charts = {};
  data?: any;
  progress: number = 0;
  message: string = '';
  totalRecords: number = 0;
  elapsedTime = '0:00:00';
  isTaskRunning: boolean = false; // Tracks whether a task is running
  taskIdKey: string = 'ccva-key'; // Do not initialize with a value
  private messageSubscription: Subscription | undefined;

  startDate = new Date();
  endDate = new Date();
  timeTaken = 0;

  constructor(
    private configService: ConfigService,
    private runCcvaService: RunCcvaService,
    private webSockettService: WebSockettService
  ) {}
  ngOnInit(): void {
    const storedTaskId = localStorage.getItem(this.taskIdKey);
    if (storedTaskId) {
      this.isTaskRunning = false;
      this.connectToSocket(storedTaskId);
    }
  }
  onCancel() {
    this.isTaskRunning = false;
    if (this.taskIdKey) {
      localStorage.removeItem(this.taskIdKey);
    }
    this.webSockettService.disconnect();
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
  }
  onRunCCVA() {
    this.isTaskRunning = true;
    this.progress = 0;
    this.message = '';
    this.totalRecords = 0;
    this.elapsedTime = '0:00:00';
    localStorage.removeItem(this.taskIdKey);
    this.runCcvaService.run_ccva().subscribe({
      next: (response: any) => {
        if (response?.data) {
          const taskId = response.data.task_id;
          localStorage.setItem(this.taskIdKey!, taskId);
          this.connectToSocket(taskId);
        }
      },
      error: (error) => {
        console.error('Error starting CCVA task:', error);
        this.isTaskRunning = false; // Reset if there's an error
      },
    });
  }

  connectToSocket(taskId: string) {
    if (!taskId) {
      console.error('No taskId provided');
      return;
    }
    this.isTaskRunning = true;
    this.webSockettService.connect(
      `${this.configService.API_URL_WS}/ccva_progress/${taskId}`
    );
    this.messageSubscription = this.webSockettService.messages.subscribe(
      (data: string) => {
        try {
          // Parse the incoming message string to JSON
          const parsedData = JSON.parse(data);

          console.log('Received message:', parsedData);

          // Update component properties with parsed data
          if (parsedData) {
            //  this.totalRecords = parsedData.total_records;
            //  this.progress = Math.round(parsedData.progress)
            //    .toFixed(0)
            //    .toString();
            //  this.elapsedTime = parsedData.elapsed_time;
            // Keep the raw message as a string

            if (parsedData.status === 'completed') {
              console.log('Task Completed: ', parsedData);
              this.data = parsedData;
              // this.charts = parsedData.data;
              this.progress = 100;
              this.elapsedTime = parsedData.elapsed_time;
              this.isTaskRunning = false; // Mark task as completed
              // eventSource.close();
              if (this.taskIdKey) {
                localStorage.removeItem(this.taskIdKey);
              }
            } else if (parsedData.error === true) {
              console.log('Task Failed: ', parsedData);
              this.isTaskRunning = false; // Mark task as failed
              this.elapsedTime = parsedData.elapsed_time ?? '0:00:00';
              // eventSource.close();
              if (this.taskIdKey) {
                localStorage.removeItem(this.taskIdKey);
              }
            } else {
              console.log('Task Progress: ', parsedData);
              console.log('Task Progress: ', parsedData.progress);
              this.data = parsedData;
              this.progress = Number(parsedData.progress) || 0;
              this.elapsedTime = parsedData.elapsed_time ?? '0:00:00';
              this.message = parsedData.message ?? '';
              // this.totalRecords = eventData.totalRecords || 0;
              // this.elapsedTime = eventData.elapsedTime || 0;
            }
          }

          // this.message = data; // Keep the raw message as a string
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
    );
  }
}
