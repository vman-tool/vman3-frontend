import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router'; // Import ActivatedRoute
import { Subscription } from 'rxjs';
import { ConfigService } from '../../../../app.service';
import { LocalStorageWithTTL } from '../../../../shared/services/localstorage_with_ttl.services';
import { RunCcvaService } from '../../services/run-ccva.service';
import { CcvaService } from '../../services/ccva.service';
import { Location } from '@angular/common'; // Import Location service

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
    private ccvaService: CcvaService,
    private location: Location,
    private route: ActivatedRoute
  ) {}

  ngOnDestroy(): void {
    // this.clearLocalStorage(); // Clear task-related localStorage data
  }

  ngOnInit(): void {}

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
