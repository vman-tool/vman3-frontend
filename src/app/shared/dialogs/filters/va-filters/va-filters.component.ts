import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DataFilterComponent } from '../data-filter/data-filter/data-filter.component';
import { FilterService } from '../../../services/filter.service';
import { LocationService } from '../../../services/location.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
@Component({
  selector: 'app-va-filters',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './va-filters.component.html',
  styleUrl: './va-filters.component.scss',
})
export class VaFiltersComponent implements OnInit {
  selectedDateType?: string; // Default to death date
  startDate?: Date;
  endDate?: Date;
  selectedLocation: string = '';
  allLocations: string[] = []; // Will be populated from the API
  isLoading: boolean = true;

  constructor(
    private locationService: LocationService,
    private filterService: FilterService,
    private datePipe: DatePipe // Inject DatePipe
  ) {}

  ngOnInit(): void {
    this.locationService.getLocations().subscribe({
        next: (locations) => {
          this.allLocations = locations;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to fetch locations:', error);
          this.isLoading = false;
        }
      }
    );
  }

  applyFilters(): void {
    const formattedStartDate = this.startDate
      ? this.datePipe.transform(this.startDate, 'yyyy-MM-dd')?.toString()
      : undefined;
    const formattedEndDate = this.endDate
      ? this.datePipe.transform(this.endDate, 'yyyy-MM-dd')?.toString()
      : undefined;
    var locations = [];
    if (this.selectedLocation !== '' && this.selectedLocation !== undefined) {
      locations.push(this.selectedLocation);
    }
    const filterData = {
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      locations: locations,
      date_type: this.selectedDateType,
    };
    console.log('Filters applied:', filterData);
    // You can now apply filters based on the selected date type and other fields.
    this.filterService.setFilterData(filterData);
  }

  resetFilters(): void {
    this.selectedDateType = 'submission_date';
    this.startDate = undefined;
    this.endDate = undefined;
    this.selectedLocation = '';
  }
}
