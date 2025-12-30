import { TriggersService } from './../../../../core/services/triggers/triggers.service';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../../../shared/dialogs/confirm/confirmation-dialog.component';
import { CcvaService } from '../../services/ccva.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-list-ccva',
  templateUrl: './list-ccva.component.html',
  styleUrls: ['./list-ccva.component.scss'],
})
export class ListCcvaComponent implements OnInit {
  // Data source for table
  data: any[] = [];

  // Pagination variables
  pageNumber: number = 1;
  limit: number = 10; // Number of rows per page
  totalRecords: number = 0;

  // Loading state
  isLoading: boolean = false;

  // Dropdown state for actions
  dropdownOpen: number | null = null;

  constructor(
    private ccvaService: CcvaService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private triggersService: TriggersService
  ) { }

  ngOnInit(): void {
    this.triggersService.triggerCCVAListFunction$.subscribe(() => {
      this.fetchData();
    });
    // Fetch the data when the component is initialized
    this.fetchData();
  }

  // Function to fetch data from API using service
  fetchData(): void {
    this.isLoading = true; // Start loading spinner

    this.ccvaService.get_list__ccva_Results().subscribe(
      (response: any) => {

        //    this.data = response.data.map((item: any) => ({
        //   ...item,
        //   start_range: item.start_range.split('T')[0] ?? item.start_range,
        //   end_range: item.end_range.split('T')[0] ?? item.end_range,
        // })); 
        this.data = response.data; // Assuming the API response has a 'data' field
        this.totalRecords = response.totalRecords; // Assuming the API response has a 'totalRecords' field
        this.isLoading = false; // Stop loading spinner
      },
      (error) => {
        console.error('Error fetching CCVA results:', error);
        this.isLoading = false; // Stop loading spinner in case of error
        this.snackBar.open('Error fetching CCVA results:', 'Close', {
          horizontalPosition: 'end',
          verticalPosition: 'top',
          duration: 3000,
        });
      }
    );
  }

  downloadDefault(row: any): void {
    console.log('Downloading default:', row);
    this.ccvaService.download_default_ccva(row.task_id);
    //   .subscribe(
    //   (response) => {
    //     const blob = new Blob([response], { type: 'application/zip' });
    //     const url = window.URL.createObjectURL(blob);
    //     window.open(url);
    //   },
    //   (error) => {
    //     console.error('Error downloading default:', error);
    //     this.snackBar.open('Error downloading default:', 'Close', {
    //       horizontalPosition: 'end',
    //       verticalPosition: 'top',
    //       duration: 3000,
    //     });
    //   }
    // );
  }

  // Action: Set as default with confirmation
  setDefault(row: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message: `Are you sure you want to set this entry as the default?`,
        action: 'Set Default',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.ccvaService.set_default_ccva(row.id).subscribe(
          () => {
            console.log('Set as default successfully:', row.id);
            this.fetchData(); // Refresh the data after successful operation
          },
          (error) => {
            console.error('Error setting as default:', error);
            this.snackBar.open('Error setting as default:', 'Close', {
              horizontalPosition: 'end',
              verticalPosition: 'top',
              duration: 3000,
            });
          }
        );
      }
    });
  }

  // Action: Delete entry with confirmation
  deleteRow(row: any): void {
    console.log(row, 'row');
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message: `Are you sure you want to delete this entry?`,
        action: 'Delete',
      },
    }).afterClosed().subscribe((confirmed: boolean) => {
      console.log('Confirmed:', confirmed);
      if (confirmed) {

        this.ccvaService.delete_ccva(row.id).subscribe(
          () => {
            console.log('Deleted successfully:', row.id);
            this.fetchData(); // Refresh the data after successful deletion
          },
          (error) => {
            console.error('Error deleting entry:', error);
            this.snackBar.open('Failed to delete entry', 'Close', {
              horizontalPosition: 'end',
              verticalPosition: 'top',
              duration: 3000,
            });
          }
        );
      }
    });
  }

  // Toggle dropdown for actions
  toggleDropdown(index: number): void {
    if (this.dropdownOpen === index) {
      this.dropdownOpen = null; // Close the dropdown if it's already open
    } else {
      this.dropdownOpen = index; // Open the dropdown for the selected row
    }
  }

  // Pagination: Go to the previous page
  goToPreviousPage(): void {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.fetchData(); // Fetch new data for the previous page
    }
  }

  // Pagination: Go to the next page
  goToNextPage(): void {
    if (this.pageNumber * this.limit < this.totalRecords) {
      this.pageNumber++;
      this.fetchData(); // Fetch new data for the next page
    }
  }

  // Method to navigate to a specific CCVA entry by its ID
  onRowClick(ccvaId: string): void {
    // Navigate to the /view/:id route
    this.router.navigate(['/ccva/view', ccvaId]);
  }
}
