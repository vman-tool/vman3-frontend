import { Component, effect, inject } from '@angular/core';
import { SubmissionsService } from '../../services/submissions/submissions.service';
import { MatDialog } from '@angular/material/dialog';
import { ResponseMainModel } from '../../../../shared/interface/main.interface';
import { SubmissionsDataModel } from '../../interface';
import { FilterService } from '../../../../shared/services/filter.service';
import { SettingConfigService } from '../../../settings/services/settings_configs.service';
import { settingsConfigData } from '../../../settings/interface';
import { MatSnackBar } from '@angular/material/snack-bar';

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
  region: string | undefined;
  district: string | undefined;

  isLoading: boolean = true; // Loading flag
  filterData: {
    locations: string[];
    start_date?: string;
    end_date?: string;
    date_type?: string;
  } = {
    locations: [],
    start_date: undefined,
    end_date: undefined,
    date_type: undefined,
  };
  constructor(
    private listSubmissionsService: SubmissionsService,
    public dialog: MatDialog,
    private filterService: FilterService,
    private settingsConfigsService: SettingConfigService,
    private snackBar: MatSnackBar
  ) {
    this.initial();
    this.loadRecords();
    this.filterService = inject(FilterService);
    this.setupEffect();
  }

  initial() {
    this.settingsConfigsService
      .getSettingsConfig(true)
      .subscribe((config: settingsConfigData | null) => {
        if (
          config &&
          Object.keys(config.odk_api_configs).length &&
          Object.keys(config.odk_api_configs).length &&
          Object.keys(config.field_mapping).length
        ) {
          this.region = config.system_configs.admin_level1;
          this.district = config.system_configs.admin_level2;
        } else {
          this.snackBar.open(
            'Please configure the system settings first!',
            'Close',
            {
              horizontalPosition: 'end',
              verticalPosition: 'top',
              duration: 3000,
            }
          );
        }
      });
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
        this.filterData.start_date,
        this.filterData.end_date,
        this.filterData.locations,
        this.filterData.date_type
      )
      .subscribe({
        next: (response: ResponseMainModel<any>) => {
          this.dataSubmissions = response.data as [];
          this.totalRecords = response.total;
          this.isLoading = false; // Set loading to false when data is fetched
        },
        error: (error) => {
          this.errorMessage = error.message;
          this.isLoading = false; // Set loading to false if there's an error
        },
      });
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
