import { Component, EventEmitter, Input, OnInit } from '@angular/core';
import { FilterService } from '../../../services/filter.service';
import { LocationService } from '../../../services/location.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { SharedModule } from '../../../shared.module';
import { CustomDropdownComponent } from '../../../components/custom-dropdown/custom-dropdown.component';
@Component({
  selector: 'app-va-filters',
  standalone: true,

  imports: [
    FormsModule,
    CommonModule,
    SharedModule,
    FormsModule,
    CustomDropdownComponent,
  ],
  templateUrl: './va-filters.component.html',
  styleUrl: './va-filters.component.scss',
})
export class VaFiltersComponent implements OnInit {
  selectedDateType?: string = 'death_date';
  startDate?: Date;
  endDate?: Date;
  selectedLocation: string[] = [];
  allLocations: any[] = [];

  isLoading: boolean = true;
  resetSelection = new EventEmitter<void>();
  closeDropdown = new EventEmitter<void>();
  constructor(
    private locationService: LocationService,
    private filterService: FilterService,
    private datePipe: DatePipe // Inject DatePipe
  ) {}

  ngOnInit(): void {
    this.resetFilterData();
    this.locationService.getLocations().subscribe({
      next: (locations) => {
        this.allLocations = locations.map((location: string) => ({
          key: location,
          value: location,
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to fetch locations:', error);
        this.isLoading = false;
      },
    });
  }
  resetFilterData() {
    // Notify filterService of the reset
    this.filterService.setFilterData({
      locations: [],
      start_date: undefined,
      end_date: undefined,
      date_type: undefined,
      ccva_graph_db_source: true,
    } as any);
  }

  applyFilters(): void {
    this.closeDropdown.emit();
    const formattedStartDate = this.startDate
      ? this.datePipe.transform(this.startDate, 'yyyy-MM-dd')?.toString()
      : undefined;
    const formattedEndDate = this.endDate
      ? this.datePipe.transform(this.endDate, 'yyyy-MM-dd')?.toString()
      : undefined;
    var locations: string[] = [];
    if (
      this.selectedLocation.length > 0 &&
      this.selectedLocation !== undefined
    ) {
      locations = this.selectedLocation;
    }
    const filterData = {
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      locations: locations,
      date_type: this.selectedDateType,
      ccva_graph_db_source: true,
    };
    console.log('Filters applied:', filterData);
    // You can now apply filters based on the selected date type and other fields.
    this.filterService.setFilterData(filterData);
  }

  resetFilters(): void {
    this.selectedDateType = undefined;
    this.startDate = undefined;
    this.endDate = undefined;
    this.selectedLocation = [];
    const filterData = {
      start_date: undefined,
      end_date: undefined,
      locations: [],
      date_type: undefined,
      ccva_graph_db_source: true,
    };
    this.resetSelection.emit();
    this.filterService.setFilterData(filterData);
  }

  onSearchableChange(selectedItems: any) {
    this.selectedLocation = selectedItems;
  }
  onOpenSelectField(isOpen: boolean) {
    if (isOpen) {
      this.addHeightClass('h-[400px]', 'h-60');
    } else {
      this.addHeightClass('h-60', 'h-[400px]');
    }
  }

  addHeightClass(addclassName?: string, removeClassName?: string) {
    const dialogElement = document.querySelector(
      '.cdk-overlay-pane.mat-mdc-dialog-panel'
    );
    if (dialogElement) {
      if (addclassName) {
        (dialogElement as HTMLElement).classList.add(addclassName);
      }
      if (removeClassName) {
        (dialogElement as HTMLElement).classList.remove(removeClassName);
      }
    }
  }
}
