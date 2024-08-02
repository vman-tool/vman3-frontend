import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ListRecordsService } from '../../services/list-records/list-records.service';
import { DataFilterComponent } from '../../dialogs/data-filter/data-filter/data-filter.component';

@Component({
  selector: 'app-list-records',
  templateUrl: './list-records.component.html',
  styleUrls: ['./list-records.component.scss'],
})
export class ListRecordsComponent implements OnInit {
  data: any[] = [];
  pageNumber: number = 1;
  limit: number = 10;
  totalRecords: number = 0;
  message: string = '';
  error: string | null = null;
  startDate?: string;
  endDate?: string;
  locations: string[] = [];

  constructor(
    private listRecordsService: ListRecordsService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.listRecordsService
      .getRecordsData(
        this.pageNumber,
        this.limit,
        this.startDate,
        this.endDate,
        this.locations
      )
      .subscribe((response) => {
        this.data = response.data;
        this.totalRecords = response.total;
        this.message = response.message;
        this.error = response.error;
      });
  }

  openFilterDialog(): void {
    const dialogRef = this.dialog.open(DataFilterComponent, {
      width: '700px',
      data: {
        startDate: this.startDate,
        endDate: this.endDate,
        locations: this.locations,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.startDate = result.startDate;
        this.endDate = result.endDate;
        this.locations = result.locations;
        this.pageNumber = 1; // Reset to the first page
        this.loadRecords();
      }
    });
  }

  goToPreviousPage(): void {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadRecords();
    }
  }

  goToNextPage(): void {
    if (this.pageNumber * this.limit < this.totalRecords) {
      this.pageNumber++;
      this.loadRecords();
    }
  }
}
