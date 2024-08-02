import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-data-filter',
  // standalone: true,
  // imports: [],
  templateUrl: './data-filter.component.html',
  styleUrl: './data-filter.component.scss',
})
export class DataFilterComponent {
  startDate?: string;
  endDate?: string;
  locations: string[] = [];
  allLocations: string[] = ['Location1', 'Location2', 'Location3']; // Example locations

  constructor(
    public dialogRef: MatDialogRef<DataFilterComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.locations = data.locations;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  applyFilters(): void {
    this.dialogRef.close({
      startDate: this.startDate,
      endDate: this.endDate,
      locations: this.locations,
    });
  }

  resetFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.locations = [];
  }
}
