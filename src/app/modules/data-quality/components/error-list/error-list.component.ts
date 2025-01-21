import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ErrorListService } from '../../services/error-list.service';
import { DataCleanerComponent } from '../data-cleaner/data-cleaner.component';

export interface ErrorItem {
  uuid: string;
  error_types: string[];
  error_messages: string[];
  group: string;
}

@Component({
  selector: 'app-error-list',
  templateUrl: './error-list.component.html',
})
export class ErrorListComponent implements OnInit {
  errors: ErrorItem[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  isLoading = true;

  errorTypes: string[] = [];
  groups: string[] = [];
  selectedErrorType: string = '';
  selectedGroup: string = '';

  constructor(
    private errorListService: ErrorListService,
    public dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadErrors();
  }

  loadErrors() {
    this.isLoading = true;
    this.errorListService
      .getErrorList(
        this.currentPage,
        this.itemsPerPage,
        this.selectedErrorType,
        this.selectedGroup
      )
      .subscribe(
        (response) => {
          this.errors = response.data['individualErrorsResults'];
          this.totalItems = response.total;
          this.isLoading = false;
          this.updateFilterOptions();
        },
        (error) => {
          console.error('Error fetching error list:', error);
          this.isLoading = false;
        }
      );
  }

  updateFilterOptions() {
    console.log(this.errors, this.selectedErrorType);
    this.errorTypes = [
      ...new Set(this.errors.map((error) => error.error_types).flat()),
    ];
    this.groups = [...new Set(this.errors.map((error) => error.group))];
  }

  openDataCleaner(error: ErrorItem) {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.autoFocus = true;
    dialogConfig.width = '99vw';
    dialogConfig.height = '100vh';
    dialogConfig.maxWidth = '99vw';
    dialogConfig.maxHeight = '100vh';
    dialogConfig.panelClass = 'full-screen-dialog';
    dialogConfig.data = error;

    this.dialog.open(DataCleanerComponent, dialogConfig);
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadErrors();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadErrors();
  }

  ceil(value: number): number {
    return Math.ceil(value);
  }
}
