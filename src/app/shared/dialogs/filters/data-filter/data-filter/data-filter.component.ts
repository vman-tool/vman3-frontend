import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { DatePipe } from '@angular/common';
import { LocationService } from '../../location.service';

@Component({
  selector: 'app-data-filter',
  templateUrl: './data-filter.component.html',
  styleUrls: ['./data-filter.component.scss'],
})
export class DataFilterComponent implements OnInit {
  startDate?: Date;
  endDate?: Date;
  selectedLocations: string[] = [];
  allLocations: string[] = []; // Will be populated from the API
  isLoading: boolean = true;

  constructor(
    public dialogRef: MatDialogRef<DataFilterComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private locationService: LocationService,
    private datePipe: DatePipe // Inject DatePipe
  ) {}

  ngOnInit(): void {
    this.locationService.getLocations().subscribe(
      (locations) => {
        this.allLocations = locations;
        this.isLoading = false;
      },
      (error) => {
        console.error('Failed to fetch locations:', error);
        this.isLoading = false;
      }
    );
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  applyFilters(isReset: boolean = false): void {
    const formattedStartDate = this.startDate
      ? this.datePipe.transform(this.startDate, 'yyyy-MM-dd')
      : null;
    const formattedEndDate = this.endDate
      ? this.datePipe.transform(this.endDate, 'yyyy-MM-dd')
      : null;

    const filterData = {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      locations: this.selectedLocations,
    };
    if (isReset == false) this.dialogRef.close(filterData);
  }

  resetFilters(): void {
    this.startDate = undefined;
    this.endDate = undefined;
    this.selectedLocations = [];
    this.applyFilters(true);
  }
}
