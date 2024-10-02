// import { Component, OnDestroy, OnInit } from '@angular/core';
// import { RunCcvaService } from '../../services/run-ccva.service';
// import { ConfigService } from 'app/app.service';
// import { WebSockettService } from '../../../settings/services/web-socket.service';
// import { Subscription } from 'rxjs';

// @Component({
//   selector: 'app-run-ccva',
//   templateUrl: './run-ccva.component.html',
//   styleUrls: ['./run-ccva.component.scss'],
// })
// export class RunCcvaComponent implements OnInit, OnDestroy {
//   filter_startDate: any;
//   filter_endDate: any;
//   dateRangeOption: string = 'all'; // 'all' or 'custom'
//   charts = {};
//   data?: any;
//   progress: number = 0;
//   message: string = '';
//   totalRecords: number = 0;
//   elapsedTime = '0:00:00';
//   start_date: string = '';

//   isTaskRunning: boolean = false; // Tracks whether a task is running
//   taskIdKey: string = 'ccva-key'; // Do not initialize with a value
//   private messageSubscription: Subscription | undefined;

//   constructor(
//     private configService: ConfigService,
//     private runCcvaService: RunCcvaService,
//     private webSockettService: WebSockettService
//   ) {}
//   ngOnDestroy(): void {
//     this.webSockettService.disconnect();
//     if (this.messageSubscription) {
//       this.messageSubscription.unsubscribe();
//     }
//   }

//   ngOnInit(): void {
//     const storedTaskId = localStorage.getItem(this.taskIdKey);
//     if (storedTaskId) {
//       this.isTaskRunning = false;
//       this.connectToSocket(storedTaskId);
//     }
//   }

//   onDateRangeChange() {
//     if (this.dateRangeOption === 'all') {
//       this.filter_startDate = null;
//       this.filter_endDate = null;
//     }
//   }

//   onCancel() {
//     this.isTaskRunning = false;
//     if (this.taskIdKey) {
//       localStorage.removeItem(this.taskIdKey);
//     }
//     this.webSockettService.disconnect();
//     if (this.messageSubscription) {
//       this.messageSubscription.unsubscribe();
//     }
//   }

//   onRunCCVA() {
//     this.isTaskRunning = true;
//     this.progress = 0;
//     this.message = '';
//     this.totalRecords = 0;
//     this.elapsedTime = '0:00:00';
//     localStorage.removeItem(this.taskIdKey);

//     // Prepare filter object based on the selected options
//     const filter = {
//       start_date:
//         this.dateRangeOption === 'custom' ? this.filter_startDate : null,
//       end_date: this.dateRangeOption === 'custom' ? this.filter_endDate : null,
//     };

//     this.runCcvaService.run_ccva(filter).subscribe({
//       next: (response: any) => {
//         if (response?.data) {
//           const taskId = response.data.task_id;
//           localStorage.setItem(this.taskIdKey!, taskId);
//           this.connectToSocket(taskId);
//         }
//       },
//       error: (error) => {
//         console.error('Error starting CCVA task:', error);
//         this.isTaskRunning = false; // Reset if there's an error
//       },
//     });
//   }

//   connectToSocket(taskId: string) {
//     if (!taskId) {
//       console.error('No taskId provided');
//       return;
//     }
//     this.isTaskRunning = true;
//     console.log('Connecting to WebSocket:', this.configService.API_URL_WS);
//     this.webSockettService.connect(
//       `${this.configService.API_URL_WS}/ccva_progress/${taskId}`
//     );
//     this.messageSubscription = this.webSockettService.messages.subscribe(
//       (data: string) => {
//         try {
//           const parsedData = JSON.parse(data);

//           if (parsedData) {
//             if (parsedData.status === 'completed') {
//               this.data = parsedData;
//               this.progress = 100;
//               this.start_date = parsedData.start_date;
//               this.elapsedTime = parsedData.elapsed_time;
//               this.totalRecords = parsedData.total_records || 0;
//               this.isTaskRunning = false;
//               if (this.taskIdKey) {
//                 localStorage.removeItem(this.taskIdKey);
//               }
//             } else if (parsedData.error === true) {
//               this.isTaskRunning = false;
//               this.elapsedTime = parsedData.elapsed_time ?? '0:00:00';
//               if (this.taskIdKey) {
//                 localStorage.removeItem(this.taskIdKey);
//               }
//             } else {
//               this.data = parsedData;
//               this.progress = Number(parsedData.progress) || 0;
//               this.elapsedTime = parsedData.elapsed_time ?? '0:00:00';
//               this.message = parsedData.message ?? '';
//               this.totalRecords = parsedData.total_records || 0;
//             }
//           }
//         } catch (error) {
//           console.error('Error parsing message:', error);
//         }
//       }
//     );
//   }
// }
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RunCcvaService } from '../../services/run-ccva.service';
import { ConfigService } from 'app/app.service';
import { WebSockettService } from '../../../settings/services/web-socket.service';
import { Subscription } from 'rxjs';
import { LocalStorageWithTTL } from '../../../../shared/services/localstorage_with_ttl.services';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-run-ccva',
  templateUrl: './run-ccva.component.html',
  styleUrls: ['./run-ccva.component.scss'],
})
export class RunCcvaComponent implements OnInit, OnDestroy {
  filter_startDate: any;
  filter_endDate: any;

  dateRangeOption: string = 'all'; // 'all' or 'custom'
  malariaStatus: string = 'h'; // Default value
  ccvaAlgorithm: string = 'InterVA5'; // Default value
  hivStatus: string = 'h'; // Default value
  charts = {};
  data?: any;
  progress: number = 0;
  message: string = '';
  totalRecords: number = 0;
  elapsedTime = '0:00:00';
  start_date: string = '';

  isTaskRunning: boolean = false; // Tracks whether a task is running
  taskIdKey: string = 'ccva-taskId'; // Store task ID in localStorage key
  taskProgressKey: string = 'ccva-progress'; // Store progress data in localStorage key
  private messageSubscription: Subscription | undefined;

  constructor(
    private configService: ConfigService,
    private runCcvaService: RunCcvaService,
    private webSockettService: WebSockettService,
    private snackBar: MatSnackBar
  ) {}

  ngOnDestroy(): void {
    this.webSockettService.disconnect();
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
  }

  ngOnInit(): void {
    // Restore task ID and progress from localStorage if available
    const storedTaskId = localStorage.getItem(this.taskIdKey);
    const storedProgress = LocalStorageWithTTL.getItemWithTTL(
      this.taskProgressKey
    );

    if (storedTaskId) {
      this.isTaskRunning = true;
      this.connectToSocket(storedTaskId); // Reconnect to the WebSocket using stored task ID
    }

    console.log('Stored progress:', storedProgress);

    if (storedProgress) {
      this.restoreProgress(storedProgress); // Restore progress from localStorage
    }
  }

  onDateRangeChange() {
    if (this.dateRangeOption === 'all') {
      this.filter_startDate = null;
      this.filter_endDate = null;
    }
  }

  onCancel() {
    this.isTaskRunning = false;
    this.clearLocalStorage(); // Clear all task-related localStorage data
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
    this.clearLocalStorage(); // Clear any previous task data

    // Prepare filter object based on the selected options
    const filter = {
      start_date:
        this.dateRangeOption === 'custom' ? this.filter_startDate : null,
      end_date: this.dateRangeOption === 'custom' ? this.filter_endDate : null,
      malaria_status: this.malariaStatus,
      ccva_algorithm: this.ccvaAlgorithm,
      hiv_status: this.hivStatus,
    };

    this.runCcvaService.run_ccva(filter).subscribe({
      next: (response: any) => {
        if (response?.data) {
          const taskId = response.data.task_id;
          localStorage.setItem(this.taskIdKey, taskId); // Store task ID in localStorage
          this.connectToSocket(taskId);
        }
      },
      error: (error) => {
        console.error('Error starting CCVA task:', error);
        this.isTaskRunning = false;
        console.log(error.error.detail);
        this.snackBar.open(
          `${
            error.error.detail ??
            error.error.message ??
            'Failed to start CCVA task'
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

  connectToSocket(taskId: string) {
    if (!taskId) {
      console.error('No taskId provided');
      return;
    }
    this.isTaskRunning = true;
    console.log('Connecting to WebSocket:', this.configService.API_URL_WS);
    this.webSockettService.connect(
      `${this.configService.API_URL_WS}/ccva_progress/${taskId}`
    );
    this.messageSubscription = this.webSockettService.messages.subscribe(
      (data: string) => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData) {
            this.updateProgress(parsedData);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
    );
  }

  // Update progress and store it in localStorage with 5-minute TTL
  private updateProgress(parsedData: any) {
    if (parsedData.status === 'completed') {
      this.data = parsedData;
      this.progress = 100;
      this.start_date = parsedData.start_date;
      this.elapsedTime = parsedData.elapsed_time;
      this.totalRecords = parsedData.total_records || 0;
      this.isTaskRunning = false;
      this.clearLocalStorage(); // Clear task-related data when task is completed
    } else if (parsedData.error === true) {
      this.isTaskRunning = false;
      this.elapsedTime = parsedData.elapsed_time ?? '0:00:00';
      this.clearLocalStorage();
    } else {
      this.data = parsedData;
      this.progress = Number(parsedData.progress) || 0;
      this.elapsedTime = parsedData.elapsed_time ?? '0:00:00';
      this.message = parsedData.message ?? '';
      this.totalRecords = parsedData.total_records || 0;

      // Store progress in localStorage with a TTL of 5 minutes
      const progressData = {
        progress: this.progress,
        elapsedTime: this.elapsedTime,
        message: this.message,
        totalRecords: this.totalRecords,
        start_date: this.start_date,
      };
      LocalStorageWithTTL.setItemWithTTL(
        this.taskProgressKey,
        progressData,
        1000 * 60 * 5
      ); // 5 minutes TTL
    }
  }

  // Restore progress from localStorage
  private restoreProgress(progressData: any) {
    this.progress = progressData.progress;
    this.elapsedTime = progressData.elapsedTime;
    this.message = progressData.message;
    this.totalRecords = progressData.totalRecords;
    this.start_date = progressData.start_date;
  }

  // Clear task-related data from localStorage
  private clearLocalStorage() {
    localStorage.removeItem(this.taskIdKey);
    localStorage.removeItem(this.taskProgressKey);
  }
}
