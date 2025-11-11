
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  RunCcvaPublicService,
  RunCcvaService,
} from '../ccva/services/run-ccva.service';
import { ConfigService } from 'app/app.service';
import { WebSockettService } from '../settings/services/web-socket.service';
import { Subscription } from 'rxjs';
import { LocalStorageWithTTL } from '../../shared/services/localstorage_with_ttl.services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TriggersService } from '../../core/services/triggers/triggers.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CustomDropdownComponent } from 'app/shared/components/custom-dropdown/custom-dropdown.component';
import { VaFiltersComponent } from 'app/shared/dialogs/filters/va-filters/va-filters.component';
import { BaseChartDirective } from 'ng2-charts';
import { CcvaRoutingModule } from '../ccva/ccva-routing.module';
import { CcvaModule } from '../ccva/ccva.module';
import { CcvaGraphsComponent } from '../ccva/components/ccva-graphs/ccva-graphs.component';
import { CcvaGraphsPublicComponent } from './ccva-public-graphs/ccva-graphs.component';
// import { ViewCcvaComponent } from '../view-ccva/view-ccva.component';

@Component({
  selector: 'app-ccva-public',
  standalone: true,
  imports: [
    CommonModule,
    // CcvaGraphsComponent,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    CcvaGraphsPublicComponent,

    FormsModule,
    MatInputModule,
    // CcvaRoutingModule,
    CustomDropdownComponent,
    // CcvaGraphsComponent
  ],
  inputs:[],
  templateUrl: './ccva-public.component.html',
  styleUrl: './ccva-public.component.scss',
})
export class CcvaPublicComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput: ElementRef | undefined;
  @ViewChild('logsContainer') logsContainer: ElementRef | undefined;
  @ViewChild('logsContainerPersistent') logsContainerPersistent: ElementRef | undefined;
  graphData=[];
  filter_startDate: any;
  filter_endDate: any;

  dateRangeOption: string = 'all'; // 'all' or 'custom'
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
  taskIdKey: string = 'ccva-taskId'; // Store task ID in localStorage key
  taskProgressKey: string = 'ccva-progress'; // Store progress data in localStorage key
  ccva_startTime: string = 'ccva-startTime';
  private messageSubscription: Subscription | undefined;
  private countdownInterval: any = null;

  dataSource: 'available' | 'csv' = 'available';
  selectedFile: File | null = null;
  csvHeaders: string[] = [];
  logs: string[] = [];
  isCsvHeadersExpanded: boolean = true;
  isLogsExpanded: boolean = true;
  constructor(
    private configService: ConfigService,
    private runCcvaPublicService: RunCcvaPublicService,
    private webSockettService: WebSockettService,
    private snackBar: MatSnackBar,
    private triggersService: TriggersService
  ) {}

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
      this.connectToSocket(storedTaskId); // Reconnect to the WebSocket using stored task ID
    }

    console.log('Stored progress:', storedProgress);

    if (storedProgress) {
      this.restoreProgress(storedProgress); // Restore progress from localStorage
    }
  }
  onDataSourceChange() {
    if (this.dataSource === 'available') {
      this.selectedFile = null;
      this.csvHeaders = [];
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.parseCSVHeaders(this.selectedFile);
    } else {
      this.selectedFile = null;
      this.csvHeaders = [];
    }
  }

  private parseCSVHeaders(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const text = e.target.result;
        // Handle different line endings (CRLF, LF, CR)
        const firstLine = text.split(/\r?\n|\r/)[0];
        // Parse CSV headers (handle quoted values)
        this.csvHeaders = this.parseCSVLine(firstLine);
      } catch (error) {
        console.error('Error parsing CSV headers:', error);
        this.csvHeaders = [];
      }
    };
    reader.onerror = () => {
      console.error('Error reading file');
      this.csvHeaders = [];
    };
    reader.readAsText(file.slice(0, 1024)); // Read only first 1KB to get headers
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  onDateRangeChange() {
    if (this.dateRangeOption === 'all') {
      this.filter_startDate = null;
      this.filter_endDate = null;
    }
  }
  onCCVACancel() {
    this.isCCvaRunning = false;
    this.onCancel();
  }
  onCancel() {
    this.isTaskRunning = false;
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
    this.logs = [];
  }

  onRunCCVA() {
    this.isCCvaRunning = true;

    this.progress = 0;
    this.message = '';
    this.totalRecords = 0;
    this.elapsedTime = '0:00:00';
    this.logs = [];
    this.countdownInterval = null;

    clearInterval(this.countdownInterval);
    this.clearLocalStorage(); // Clear any previous task data
    this.ngOnInit();
    // Prepare filter object based on the selected options
    const filter = {
      start_date:
        this.dateRangeOption === 'custom' ? this.filter_startDate : null,
      end_date: this.dateRangeOption === 'custom' ? this.filter_endDate : null,
      malaria_status: this.malariaStatus,
      ccva_algorithm: this.ccvaAlgorithm,
      hiv_status: this.hivStatus,
      date_type: this.selectedDateType,
    };
    this.uploadCSVAndRunCCVA(filter);
  }
  private uploadCSVAndRunCCVA(filter: any) {
    if (!this.selectedFile) {
      console.error('No file selected');
      return;
    }

    this.addLog('Starting CCVA analysis...');
    this.addLog(`File: ${this.selectedFile.name}`);
    this.addLog(`Algorithm: ${this.ccvaAlgorithm}`);

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    // Append filter parameters to formData
    Object.keys(filter).forEach((key) => {
      if (filter[key] !== null) {
        formData.append(key, filter[key]);
      }
    });

    this.runCcvaPublicService.runCcvaWithCSV(formData).subscribe({
      next: (response: any) => {
        if (response?.data) {
          console.log('CCVA task started with CSV:', response.data);
          this.isTaskRunning = true;
          this.addLog('Task initialized successfully');
          if (response?.data) {
            this.updateProgress(response?.data);
          }

          const taskId = response.data.task_id;
          this.addLog(`Task ID: ${taskId}`);
          localStorage.setItem(this.taskIdKey, taskId);
          this.connectToSocket(taskId);
          this.isCCvaRunning = false;
        }
      },
      error: (error) => {
        console.error('Error starting CCVA task with CSV:', error);
        const errorMessage = error.error?.detail ?? error.error?.message ?? 'Failed to start CCVA task with CSV';
        this.addLog(`ERROR: ${errorMessage}`);
        this.isCCvaRunning = false;
        this.isTaskRunning = false;
        this.triggersService.triggerCCVAListFunction();
        this.snackBar.open(errorMessage, 'Close', {
          horizontalPosition: 'end',
          verticalPosition: 'top',
          duration: 3000,
        });
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
      this.addLog('Analysis completed successfully!');
      this.addLog(`Total records processed: ${this.totalRecords}`);
      this.isTaskRunning = false;
      // Collapse sections to save space after completion
      this.isLogsExpanded = false;
      this.isCsvHeadersExpanded = false;
      this.triggersService.triggerCCVAListFunction(); // Trigger CCVA list refresh
      this.clearLocalStorage(); // Clear task-related data when task is completed
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
      }

      // open the graph view if
      console.log(parsedData);
if(parsedData.data){
  var public_ccva_results:any[]=  JSON.parse(localStorage.getItem(
    'public_ccva_results')??'[]');

// if(public_ccva_results){

// }
public_ccva_results=[
  public_ccva_results,
  parsedData.data
]

  localStorage.setItem(
   'public_ccva',
   JSON.stringify(public_ccva_results)
  )
  this.graphData=parsedData.data;

}
    } else if (parsedData.error === true) {
      this.isTaskRunning = false;
      // Collapse sections to save space after error
      this.isLogsExpanded = false;
      this.isCsvHeadersExpanded = false;
      console.error('Error in CCVA task:', parsedData);
      this.addLog(`ERROR: ${parsedData.message || 'Task failed'}`);
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

      // Capture logs from the progress update
      if (parsedData.log) {
        this.addLog(parsedData.log);
      } else if (parsedData.logs && Array.isArray(parsedData.logs)) {
        parsedData.logs.forEach((log: string) => this.addLog(log));
      } else if (parsedData.message) {
        // Use message as log if no dedicated log field
        this.addLog(parsedData.message);
      }

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

  private addLog(logMessage: string) {
    if (logMessage && logMessage.trim()) {
      const timestamp = new Date().toLocaleTimeString();
      this.logs.push(`[${timestamp}] ${logMessage}`);
      // Keep only last 100 logs to prevent memory issues
      if (this.logs.length > 100) {
        this.logs.shift();
      }
      // Auto-scroll to bottom after a short delay to allow DOM update
      setTimeout(() => {
        this.scrollLogsToBottom();
      }, 0);
    }
  }

  private scrollLogsToBottom() {
    if (this.logsContainer?.nativeElement) {
      const element = this.logsContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
    if (this.logsContainerPersistent?.nativeElement) {
      const element = this.logsContainerPersistent.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }
}
