import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { RunCcvaService } from '../../services/run-ccva.service';
import { ConfigService } from 'app/app.service';
import { WebSockettService } from '../../../settings/services/web-socket.service';
import { Subscription } from 'rxjs';
import { LocalStorageWithTTL } from '../../../../shared/services/localstorage_with_ttl.services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TriggersService } from '../../../../core/services/triggers/triggers.service';

@Component({
  selector: 'app-run-ccva',
  templateUrl: './run-ccva.component.html',
  styleUrls: ['./run-ccva.component.scss'],
})
export class RunCcvaComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput: ElementRef | undefined;
  filter_startDate: any;
  filter_endDate: any;

  dateRangeOption: string = '200'; // 'all' or 'custom'
  selectedDateType = 'death_date';
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
  isCCvaRunning: boolean = false;
  isTaskRunning: boolean = false; // Tracks whether a task is running
  isResultsPanelVisible: boolean = false; // Tracks whether the results panel is shown
  taskIdKey: string = 'ccva-taskId'; // Store task ID in localStorage key
  taskProgressKey: string = 'ccva-progress'; // Store progress data in localStorage key
  ccva_startTime: string = 'ccva-startTime';
  private messageSubscription: Subscription | undefined;
  private countdownInterval: any = null;

  dataSource: 'available' | 'csv' = 'available';
  selectedFile: File | null = null;
  logs: string[] = []; // Array to store log messages
  isLogsExpanded: boolean = true;
  @ViewChild('logsContainer') private logsContainer: ElementRef | undefined; // Reference to logs container for auto-scrolling
  constructor(
    private configService: ConfigService,
    private runCcvaService: RunCcvaService,
    private webSockettService: WebSockettService,
    private snackBar: MatSnackBar,
    private triggersService: TriggersService
  ) { }

  ngOnDestroy(): void {
    this.webSockettService.disconnect();
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.countdownInterval) {
      this.countdownInterval = null;
      this.elapsedTime = '0:00:00';
      clearInterval(this.countdownInterval);
    }
  }

  ngOnInit(): void {
    // Restore task ID and progress from localStorage if available
    this.elapsedTime = '0:00:00';
    const storedTaskId = localStorage.getItem(this.taskIdKey);
    const storedProgress = LocalStorageWithTTL.getItemWithTTL(
      this.taskProgressKey
    );

    if (storedTaskId) {
      this.isTaskRunning = true;
      this.isResultsPanelVisible = true;

      // Fetch latest progress from backend to sync state immediately
      this.runCcvaService.getTaskProgress(storedTaskId).subscribe({
        next: (progressData) => {
          if (progressData) {
            console.log('Restored progress from backend:', progressData);
            this.updateProgress(progressData);
          }
        },
        error: (err) => {
          console.error('Failed to fetch task progress:', err);
          // If backend says 404/error, maybe we should clear local storage?
          // For now, we just rely on local storage fallback below
        }
      });

      this.connectToSocket(storedTaskId); // Reconnect to the WebSocket using stored task ID
    }

    console.log('Stored progress:', storedProgress);

    // Use stored progress as initial state while waiting for API/Socket
    if (storedProgress) {
      this.isResultsPanelVisible = true;
      this.restoreProgress(storedProgress);
    }
  }
  onDataSourceChange() {
    if (this.dataSource === 'available') {
      this.selectedFile = null;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onDateRangeChange() {
    if (this.dateRangeOption === 'all') {
      this.filter_startDate = null;
      this.filter_endDate = null;
    }
  }

  closeResultsPanel() {
    this.isResultsPanelVisible = false;
    // Optionally clear logs/data if desired when closing:
    // this.logs = [];
    // this.data = null;
  }

  onCCVACancel() {
    this.isCCvaRunning = false;
    this.onCancel();
  }
  onCancel() {
    this.isTaskRunning = false;
    this.isResultsPanelVisible = false;
    this.triggersService.triggerCCVAListFunction();
    this.clearLocalStorage(); // Clear all task-related localStorage data
    this.webSockettService.disconnect();
    clearInterval(this.countdownInterval);
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.countdownInterval) {
      this.countdownInterval = null;
    }
  }

  onRunCCVA() {
    this.isCCvaRunning = true;
    this.isResultsPanelVisible = true;

    this.progress = 0;
    this.message = '';
    this.totalRecords = 0;
    this.elapsedTime = '0:00:00';
    this.logs = []; // Reset logs
    this.countdownInterval = null;

    clearInterval(this.countdownInterval);
    this.clearLocalStorage();
    this.ngOnInit();

    // Prepare filter object based on the selected options
    const filter = {
      start_date: this.dateRangeOption === 'custom' ? this.filter_startDate : null,
      end_date: this.dateRangeOption === 'custom' ? this.filter_endDate : null,
      top: this.dateRangeOption === '200' ? 200 : null,
      malaria_status: this.malariaStatus,
      ccva_algorithm: this.ccvaAlgorithm,
      hiv_status: this.hivStatus,
      date_type: this.selectedDateType,
    };

    if (this.dataSource === 'csv') {
      this.uploadCSVAndRunCCVA(filter);
    } else {
      this.runCcvaService.run_ccva(filter).subscribe({
        next: (response: any) => {
          if (response?.data) {
            console.log('CCVA task started:', response.data);
            this.isTaskRunning = true;
            this.isResultsPanelVisible = true;
            if (response?.data) {
              this.updateProgress(response?.data);
            }

            const taskId = response.data.task_id;
            localStorage.setItem(this.taskIdKey, taskId); // Store task ID in localStorage
            this.connectToSocket(taskId);
            this.isCCvaRunning = false;
          }
        },
        error: (error) => {
          console.error('Error starting CCVA task:', error);
          this.isCCvaRunning = false;
          this.isTaskRunning = false;
          // Keep panel visible if there was an error so user sees it? 
          // Usually we show snackbar, but maybe logs/message in panel too if init failed?
          // For now, follow existing pattern of hide/reset, but maybe implementation plan implied keeping it?
          // existing code called triggersService and snackbar. I'll stick to that for startup failures.
          this.isResultsPanelVisible = false;
          this.triggersService.triggerCCVAListFunction();
          console.log(error.error.detail);
          this.snackBar.open(
            `${error.error.detail ??
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
  }

  private uploadCSVAndRunCCVA(filter: any) {
    if (!this.selectedFile) {
      console.error('No file selected');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    // Append filter parameters to formData
    Object.keys(filter).forEach((key) => {
      if (filter[key] !== null) {
        formData.append(key, filter[key]);
      }
    });

    this.runCcvaService.runCcvaWithCSV(formData).subscribe({
      next: (response: any) => {
        if (response?.data) {
          console.log('CCVA task started with CSV:', response.data);
          this.isTaskRunning = true;
          this.isResultsPanelVisible = true;
          if (response?.data) {
            this.updateProgress(response?.data);
          }

          const taskId = response.data.task_id;
          localStorage.setItem(this.taskIdKey, taskId);
          this.connectToSocket(taskId);
          this.isCCvaRunning = false;
        }
      },
      error: (error) => {
        console.error('Error starting CCVA task with CSV:', error);
        this.isCCvaRunning = false;
        this.isTaskRunning = false;
        this.isResultsPanelVisible = false;
        this.triggersService.triggerCCVAListFunction();
        this.snackBar.open(
          `${error.error.detail ??
          error.error.message ??
          'Failed to start CCVA task with CSV'
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
    this.isResultsPanelVisible = true;
    console.log('Connecting to WebSocket:', this.configService.API_URL_WS);
    this.webSockettService.connect(
      `${this.configService.API_URL_WS}/ccva_progress/${taskId}`
    );
    // Start the countdown from the first elapsed time received
    if (!this.countdownInterval) {
      let startTime = new Date().getTime();
      if (localStorage.getItem(this.ccva_startTime)) {
        startTime = parseInt(localStorage.getItem(this.ccva_startTime) ?? '0');
      }

      localStorage.setItem(this.ccva_startTime, startTime.toString());
      this.startCountdown(startTime);
    }
    this.messageSubscription = this.webSockettService.messages.subscribe(
      (data: string) => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData) {
            this.updateProgress(parsedData);
          }
        } catch (error: any) {
          this.snackBar.open(
            `${error.error.detail ??
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
          console.error('Error parsing message:', error);
        }
      }
    );
  }

  // Update progress and store it in localStorage with 5-minute TTL
  private updateProgress(parsedData: any) {
    // Process Log
    if (parsedData.log) {
      this.logs.push(parsedData.log);
      this.scrollToBottom();
    }

    // Ensure panel is visible when we get updates
    this.isResultsPanelVisible = true;

    if (parsedData.status === 'completed') {
      this.data = parsedData;
      this.progress = 100;
      this.start_date = parsedData.start_date;
      this.elapsedTime = parsedData.elapsed_time;
      this.totalRecords = parsedData.total_records || 0;
      this.isTaskRunning = false; // Task finished, but panel stays
      this.triggersService.triggerCCVAListFunction(); // Trigger CCVA list refresh
      this.clearLocalStorage(); // Clear task-related data when task is completed
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
      }
    } else if (parsedData.error === true) {
      this.isTaskRunning = false;
      console.error('Error in CCVA task:', parsedData);
      this.triggersService.triggerCCVAListFunction();
      this.elapsedTime = parsedData.elapsed_time ?? '0:00:00';
      this.clearLocalStorage(); // Clear task-related data when task is completed
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
      }
      this.snackBar.open(`${parsedData.message}`, 'Close', {
        horizontalPosition: 'end',
        verticalPosition: 'top',
        duration: 8000,
      });
      return;
    } else {
      if (
        parsedData.progress == undefined ||
        parsedData.progress == null ||
        parsedData.progress == ''
      ) {
        return;
      }

      this.data = parsedData;
      this.progress = Number(parsedData.progress) || 0;
      // this.elapsedTime = parsedData.elapsed_time ?? '0:00:00';
      this.message = parsedData.message ?? '';
      this.totalRecords = parsedData.total_records || 0;

      // Store progress in localStorage with a TTL of 5 minutes
      const progressData = {
        progress: this.progress,
        elapsedTime: this.elapsedTime,
        message: this.message,
        totalRecords: this.totalRecords,
        start_date: this.start_date,
        logs: this.logs,
      };
      LocalStorageWithTTL.setItemWithTTL(
        this.taskProgressKey,
        progressData,
        1000 * 60 * 5
      ); // 5 minutes TTL
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.logsContainer) {
          this.logsContainer.nativeElement.scrollTop = this.logsContainer.nativeElement.scrollHeight;
        }
      } catch (err) { }
    }, 100);
  }

  // Restore progress from localStorage
  private restoreProgress(progressData: any) {
    this.progress = progressData.progress;
    this.elapsedTime = progressData.elapsedTime;
    this.message = progressData.message;
    this.totalRecords = progressData.totalRecords;
    this.start_date = progressData.start_date;
    if (progressData.logs) {
      this.logs = progressData.logs;
    }
  }

  // Clear task-related data from localStorage
  private clearLocalStorage() {
    localStorage.removeItem(this.ccva_startTime);
    localStorage.removeItem(this.taskIdKey);
    localStorage.removeItem(this.taskProgressKey);
  }

  // Start a countdown based on the start time
  private startCountdown(startTime: number) {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      const now = new Date().getTime();
      const elapsed = now - startTime;
      this.elapsedTime = this.formatElapsedTimeFromMilliseconds(elapsed);
    }, 1000);
  }

  // Format the elapsed time string received from the socket
  private formatElapsedTime(elapsedTime: string): string {
    const timeParts = elapsedTime.split(':');

    let hours = parseInt(timeParts[0], 10) || 0;
    let minutes = parseInt(timeParts[1], 10) || 0;
    let seconds = parseInt(timeParts[2], 10) || 0;

    // Pad hours, minutes, and seconds to ensure two digits
    const formattedHours = this.padZero(hours);
    const formattedMinutes = this.padZero(minutes);
    const formattedSeconds = this.padZero(seconds);

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }

  // Convert milliseconds to HH:mm:ss format
  private formatElapsedTimeFromMilliseconds(ms: number): string {
    let totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${this.padZero(hours)}:${this.padZero(minutes)}:${this.padZero(
      seconds
    )}`;
  }

  private padZero(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
  }
}
