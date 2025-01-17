import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DataCleanerComponent } from '../data-cleaner/data-cleaner.component';
import { ErrorListService } from '../../services/error-list.service';
interface GroupedError {
  error_type: string;
  total: number;
}

interface IndividualError {
  type: string;
  uuid: string;
  error_type: string;
  error_types: string[];
  error_messages: string[];
  source: string;
  group: string;
}

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
})
export class MainErrorComponent implements OnInit {
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  isLoading = true;

  errorTypes: string[] = [];
  groups: string[] = [];
  selectedErrorType: string = '';
  selectedGroup: string = '';

  individualErrors: IndividualError[] = [];
  errorSources: string[] = ['Algorithm InterVA 5', 'Algorithm InSilico VA'];
  errors: IndividualError[] = [];
  selectedSource: string = '';

  groupedErrors: GroupedError[] = [];
  constructor(
    private errorListService: ErrorListService,
    public dialog: MatDialog
  ) {}
  onSourceChange(event: Event): void {
    this.selectedSource = (event.target as HTMLSelectElement).value;
  }

  openDataCleaner(error: any) {
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

  ngOnInit() {
    this.loadErrors();
  }
  updateFilterOptions() {
    console.log(this.errors, this.selectedErrorType);
    this.errorTypes = [
      ...new Set(this.errors.map((error) => error.error_types).flat()),
    ];
    this.groups = [...new Set(this.errors.map((error) => error.group))];
  }
  loadErrors() {
    this.isLoading = true;
    console.log('Loading errors', this.selectedErrorType);
    this.errorListService
      .getErrorList(
        this.currentPage,
        this.itemsPerPage,
        this.selectedErrorType,
        this.selectedGroup
      )
      .subscribe(
        (response) => {
          this.individualErrors = response.data['individualErrorsResults'];
          this.groupedErrors = response.data['groupedErrorsCounts'];
          // this.totalItems = response.total;
          this.isLoading = false;
          this.updateFilterOptions();
        },
        (error) => {
          console.error('Error fetching error list:', error);
          this.isLoading = false;
        }
      );
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadErrors();
  }

  onFilterChange(event: any) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedValue = selectElement.value;
    console.log(selectedValue);
    this.currentPage = 1;
    this.loadErrors();
  }
  ceil(value: number): number {
    return Math.ceil(value);
  }
}
