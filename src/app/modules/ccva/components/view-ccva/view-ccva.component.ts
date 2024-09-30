import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router'; // Import ActivatedRoute
import { Subscription } from 'rxjs';
import { ConfigService } from '../../../../app.service';
import { LocalStorageWithTTL } from '../../../../shared/services/localstorage_with_ttl.services';
import { RunCcvaService } from '../../services/run-ccva.service';
import { CcvaService } from '../../services/ccva.service';
import { Location } from '@angular/common'; // Import Location service

interface ProgressData {
  progress: number;
  elapsedTime: string;
  message: string;
  totalRecords: number;
  start_date: string;
}

@Component({
  selector: 'app-view-ccva',
  templateUrl: './view-ccva.component.html',
  styleUrl: './view-ccva.component.scss',
})
export class ViewCcvaComponent implements OnInit, OnDestroy {
  filter_startDate: any;
  filter_endDate: any;
  dateRangeOption: string = 'all'; // 'all' or 'custom'
  graphData: any = {};
  data?: any;
  progress: number = 0;
  message: string = '';
  totalRecords: number = 0;
  elapsedTime = '0:00:00';
  start_date: string = '';

  isTaskRunning: boolean = false; // Tracks whether a task is running
  taskIdKey: string = 'ccva-taskId'; // Store task ID in localStorage key
  taskProgressKey: string = 'ccva-progress'; // Store progress data in localStorage key

  constructor(
    private configService: ConfigService,
    private ccvaService: CcvaService,
    private runCcvaService: RunCcvaService,
    private location: Location,
    private route: ActivatedRoute,
    private router: Router // Inject ActivatedRoute to read URL parameters
  ) {}

  ngOnDestroy(): void {
    // this.clearLocalStorage(); // Clear task-related localStorage data
  }

  ngOnInit(): void {
    // Extract taskId from the URL query parameter
    console.log('ViewCcvaComponent: ngOnInit');
    this.route.params.subscribe((params) => {
      const taskId = params['id']; // Get 'id' from route parameters
      if (taskId) {
        this.fetchProgress(taskId);
      } else {
        console.error('No task ID provided in the URL');
      }
    });
  }

  onDateRangeChange() {
    if (this.dateRangeOption === 'all') {
      this.filter_startDate = null;
      this.filter_endDate = null;
    }
  }

  onCancel() {
    this.isTaskRunning = false;
    // this.clearLocalStorage(); // Clear all task-related localStorage data
  }

  // Fetch task progress from the API (instead of WebSocket)
  async fetchProgress(taskId: string) {
    if (!taskId) {
      console.error('No taskId provided');
      return;
    }
    this.isTaskRunning = true;

    this.ccvaService.get_ccva_by_id(taskId).subscribe({
      next: (progressData: any) => {
        console.log('Progress data:', progressData);
        this.graphData = progressData.data;
        this.updateProgress(progressData);
        this.isTaskRunning = false;
      },
      error: (error) => {
        console.error('Error fetching progress:', error);
      },
    });
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
      // this.clearLocalStorage(); // Clear task-related data when task is completed
    } else if (parsedData.error === true) {
      this.isTaskRunning = false;
      this.elapsedTime = parsedData.elapsed_time ?? '0:00:00';
    } else {
      this.data = parsedData;
      this.progress = Number(parsedData.progress) || 0;
      this.elapsedTime = parsedData.elapsed_time ?? '0:00:00';
      this.message = parsedData.message ?? '';
      this.totalRecords = parsedData.total_records || 0;

      // Store progress in localStorage with a TTL of 5 minutes
      const progressData: ProgressData = {
        progress: this.progress,
        elapsedTime: this.elapsedTime,
        message: this.message,
        totalRecords: this.totalRecords,
        start_date: this.start_date,
      };
      // 5 minutes TTL
    }
  }

  // Back Navigation
  onBack() {
    this.location.back();
    // this.router.navigate(['/ccva']); // Adjust to your desired route
  }

  // Delete Task or CCVA
  onDelete() {
    this.route.queryParams.subscribe((params) => {
      const taskId = params['id'];
      if (taskId) {
        this.ccvaService.delete_ccva(taskId).subscribe({
          next: () => {
            console.log('CCVA deleted successfully');
            this.onBack(); // Redirect after deletion
          },
          error: (error) => {
            console.error('Error deleting CCVA:', error);
          },
        });
      } else {
        console.error('No taskId found to delete');
      }
    });
  }

  // Set Task or CCVA as Default
  onSetDefault() {
    this.route.queryParams.subscribe((params) => {
      const taskId = params['id'];
      if (taskId) {
        this.ccvaService.set_default_ccva(taskId).subscribe({
          next: () => {
            console.log('CCVA set as default successfully');
          },
          error: (error) => {
            console.error('Error setting CCVA as default:', error);
          },
        });
      } else {
        console.error('No taskId found to set as default');
      }
    });
  }
}
