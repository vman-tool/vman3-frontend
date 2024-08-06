import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DataFilterComponent } from '../data-filter/data-filter/data-filter.component';
import { FilterService } from '../filter.service';

@Component({
  selector: 'app-va-filters',
  standalone: true,
  imports: [],
  templateUrl: './va-filters.component.html',
  styleUrl: './va-filters.component.scss',
})
export class VaFiltersComponent {
  constructor(public dialog: MatDialog, private filterService: FilterService) {}
  openFilterDialog(): void {
    const dialogRef = this.dialog.open(DataFilterComponent, {
      width: '700px',
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        console.log('The dialog was closed', result);
        this.filterService.setFilterData(result);
        // this.pageNumber = 1; // Reset to the first page
        // this.loadRecords();
      }
    });
  }
}
