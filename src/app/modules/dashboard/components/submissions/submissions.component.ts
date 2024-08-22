import { Component, effect, inject } from '@angular/core';
import { SubmissionsService } from '../../services/submissions/submissions.service';
import { MatDialog } from '@angular/material/dialog';
import { ResponseMainModel } from '../../../../shared/interface/main.interface';
import { SubmissionsDataModel } from '../../interface';
import { FilterService } from '../../../../shared/dialogs/filters/filter.service';

@Component({
  selector: 'app-submissions',
  templateUrl: './submissions.component.html',
  styleUrls: ['./submissions.component.scss'],
})
export class SubmissionsComponent {
  dataSubmissions: SubmissionsDataModel[] = [];
  pageNumber: number = 1;
  limit: number = 10;
  totalRecords: number | undefined;
  message: string = '';
  errorMessage: string | null = null;

  isLoading: boolean = true; // Loading flag
  filterData: { locations: string[]; startDate?: string; endDate?: string } = {
    locations: [],
    startDate: undefined,
    endDate: undefined,
  };
  constructor(
    private listSubmissionsService: SubmissionsService,
    public dialog: MatDialog,
    private filterService: FilterService
  ) {
    this.loadRecords();
    this.filterService = inject(FilterService);
    this.setupEffect();
  }
  setupEffect() {
    effect(() => {
      this.filterData = this.filterService.filterData();
      this.loadRecords();
    });
  }
  loadRecords(): void {
    this.isLoading = true; // Set loading to true when starting to fetch data
    this.listSubmissionsService
      .getsubmissionsData(
        this.pageNumber,
        this.limit,
        this.filterData.startDate,
        this.filterData.endDate,
        this.filterData.locations
      )
      .subscribe(
        (response: ResponseMainModel<any>) => {
          this.dataSubmissions = response.data as [];
          this.totalRecords = response.total;
          this.isLoading = false; // Set loading to false when data is fetched
        },
        (error) => {
          this.errorMessage = error.message;
          this.isLoading = false; // Set loading to false if there's an error
        }
      );
  }

  getTotalCount(): number {
    return this.dataSubmissions.reduce((acc, record) => acc + record.count, 0);
  }

  getTotalAdults(): number {
    return this.dataSubmissions.reduce((acc, record) => acc + record.adults, 0);
  }

  getTotalChildren(): number {
    return this.dataSubmissions.reduce(
      (acc, record) => acc + record.children,
      0
    );
  }

  getTotalNeonates(): number {
    return this.dataSubmissions.reduce(
      (acc, record) => acc + record.neonates,
      0
    );
  }

  getTotalMale(): number {
    return this.dataSubmissions.reduce((acc, record) => acc + record.male, 0);
  }

  getTotalFemale(): number {
    return this.dataSubmissions.reduce((acc, record) => acc + record.female, 0);
  }

  downloadRecords() {
    this.listSubmissionsService.exportToExcel(
      this.dataSubmissions,
      'VA_Submissions'
    );
  }
}
