import {
  Component,
  effect,
  inject,
  OnInit,
  runInInjectionContext,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ListRecordsService } from '../../services/list-records/list-records.service';
import { DataFilterComponent } from '../../../../shared/dialogs/filters/data-filter/data-filter/data-filter.component';
import { FilterService } from '../../../../shared/dialogs/filters/filter.service';

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
  filterData: { locations: string[]; startDate?: string; endDate?: string } = {
    locations: [],
    startDate: undefined,
    endDate: undefined,
  };

  constructor(
    private listRecordsService: ListRecordsService,
    public dialog: MatDialog,
    private filterService: FilterService
  ) {
    this.filterService = inject(FilterService);
    this.setupEffect();
  }
  setupEffect() {
    effect(() => {
      this.filterData = this.filterService.filterData();
      this.loadRecords();
    });
  }

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.listRecordsService
      .getRecordsData(
        this.pageNumber,
        this.limit,
        this.filterData.startDate,
        this.filterData.endDate,
        this.filterData.locations
      )
      .subscribe((response) => {
        this.data = response.data;
        this.totalRecords = response.total;
        this.message = response.message;
        this.error = response.error;
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
