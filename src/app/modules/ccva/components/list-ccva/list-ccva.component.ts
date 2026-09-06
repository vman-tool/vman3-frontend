import { TriggersService } from './../../../../core/services/triggers/triggers.service';
import { Component, HostListener, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../../../shared/dialogs/confirm/confirmation-dialog.component';
import { CcvaService } from '../../services/ccva.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  standalone: false,
  selector: 'app-list-ccva',
  templateUrl: './list-ccva.component.html',
  styleUrls: ['./list-ccva.component.scss'],
})
export class ListCcvaComponent implements OnInit {
  // Data source for table
  data: any[] = [];

  // Pagination variables
  pageNumber: number = 1;
  limit: number = 10;
  totalRecords: number = 0;

  // Loading state
  isLoading: boolean = false;

  // Dropdown state for actions. Rendered as a single fixed-position portal
  // outside the table's overflow-x-auto wrapper (see template) - nested
  // inside it, the menu was clipped by that wrapper for rows near the
  // bottom of the table instead of floating above the page.
  dropdownOpen: number | null = null;
  dropdownRow: any = null;
  dropdownPosition: { top: number; left: number } = { top: 0, left: 0 };

  // Row selection — max 2, FIFO queue
  selectedRows: any[] = [];

  // Same 'h'/'l'/'v' -> label mapping as the run-ccva form
  // (run-ccva.component.html) that captures these settings.
  private readonly malariaHivLabels: { [code: string]: string } = {
    h: 'High',
    l: 'Low',
    v: 'Very Low',
  };

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
        this.data = response.data ?? [];
        // The API returns { data, message, error, total, pager } - there is no
        // 'totalRecords' key, which is why the footer count rendered blank.
        // 'total' exists but the backend leaves it null, so fall back to the
        // array length; this endpoint returns the full set unpaginated.
        this.totalRecords = response.total ?? this.data.length;
        // Guard against sitting on a page that no longer exists after a refresh
        if ((this.pageNumber - 1) * this.limit >= this.totalRecords) {
          this.pageNumber = 1;
        }
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

  // Action: Clear default status with confirmation
  clearDefault(row: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message: `Are you sure you want to clear this entry's default status?`,
        action: 'Clear Default',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.ccvaService.clear_default_ccva(row.id).subscribe(
          () => {
            console.log('Cleared default successfully:', row.id);
            this.fetchData(); // Refresh the data after successful operation
          },
          (error) => {
            console.error('Error clearing default:', error);
            this.snackBar.open('Error clearing default:', 'Close', {
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

  // The list endpoint is unpaginated, so slice client-side. Without this the
  // Previous/Next buttons changed pageNumber while the rows stayed identical.
  get pagedData(): any[] {
    const start = (this.pageNumber - 1) * this.limit;
    return this.data.slice(start, start + this.limit);
  }

  get rangeStart(): number {
    return this.totalRecords === 0 ? 0 : (this.pageNumber - 1) * this.limit + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.pageNumber * this.limit, this.totalRecords);
  }

  get hasPrevious(): boolean { return this.pageNumber > 1; }
  get hasNext(): boolean { return this.pageNumber * this.limit < this.totalRecords; }

  // Row selection — max 2 rows, FIFO
  toggleRowSelection(row: any): void {
    const idx = this.selectedRows.findIndex(r => r.id === row.id);
    if (idx > -1) {
      this.selectedRows.splice(idx, 1);
    } else {
      if (this.selectedRows.length >= 2) {
        this.selectedRows.shift(); // drop oldest selection
      }
      this.selectedRows.push(row);
    }
  }

  isRowSelected(row: any): boolean {
    return this.selectedRows.some(r => r.id === row.id);
  }

  compareCSMF(): void {
    this.closeDropdown();
    if (this.selectedRows.length !== 2) {
      this.snackBar.open('Select exactly 2 runs using the checkboxes to compare.', 'Close', {
        horizontalPosition: 'end',
        verticalPosition: 'top',
        duration: 3500,
      });
      return;
    }
    this.router.navigate(
      ['/ccva/compare', this.selectedRows[0].id, this.selectedRows[1].id],
      { queryParams: { algo1: this.selectedRows[0].algorithm, algo2: this.selectedRows[1].algorithm } }
    );
  }

  // Toggle dropdown for actions. Position is computed from the trigger
  // button so the fixed-position portal (see template) lands next to it.
  toggleDropdown(index: number, row: any, event: MouseEvent): void {
    if (this.dropdownOpen === index) {
      this.closeDropdown();
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.dropdownPosition = { top: rect.bottom + 4, left: rect.right - 192 }; // 192px = w-48
    this.dropdownRow = row;
    this.dropdownOpen = index;
  }

  closeDropdown(): void {
    this.dropdownOpen = null;
    this.dropdownRow = null;
  }

  // Click anywhere outside the menu closes it; clicks inside it (button or
  // menu items) stop propagation before reaching here (see template).
  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeDropdown();
  }

  // Fixed positioning doesn't track the row while scrolling, so close
  // rather than let the menu drift away from its button.
  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.closeDropdown();
  }

  // Paging is client-side (see pagedData), so these only move the window -
  // refetching would just pull the same unpaginated payload again.
  goToPreviousPage(): void {
    if (this.hasPrevious) {
      this.pageNumber--;
      this.closeDropdown();
    }
  }

  goToNextPage(): void {
    if (this.hasNext) {
      this.pageNumber++;
      this.closeDropdown();
    }
  }

  // Method to navigate to a specific CCVA entry by its ID
  onRowClick(ccvaId: string): void {
    // Navigate to the /view/:id route
    this.router.navigate(['/ccva/view', ccvaId]);
  }

  // 'h'/'l'/'v' -> 'High'/'Low'/'Very Low'; '—' when this run predates the
  // column (malaria_status/hiv_status weren't saved on older runs) or ran
  // with the setting left unset.
  malariaHivLabel(code: string | null | undefined): string {
    if (!code) return '—';
    return this.malariaHivLabels[code] ?? code;
  }

  // Navigate to the individual VA-level classifications for this run
  // ("Display Data") - keyed by task_id, which is what ccva_results (unlike
  // the graph summary's own _key/row.id) is actually stored against.
  onDisplayData(row: any): void {
    this.closeDropdown();
    this.router.navigate(['/ccva/data', row.task_id]);
  }
}
