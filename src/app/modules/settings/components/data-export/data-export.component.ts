import { Component, OnInit } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { DatePipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataSyncService } from '../../services/data_sync.service';
import { SettingConfigService } from '../../services/settings_configs.service';
import { UsersService } from '../../services/users.service';
import { FieldMapping, SystemConfig } from '../../interface';
import { ConfigService } from 'app/app.service';
import { AuthService } from 'app/core/services/authentication/auth.service';
import * as privileges from 'app/shared/constants/privileges.constants';
import { LocationLevel, LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';

@Component({
  standalone: false,
  selector: 'app-data-export',
  templateUrl: './data-export.component.html',
})
export class DataExportComponent implements OnInit {
  selectedDateType: string = 'submission_date';
  filter_startDate: string | null = null;
  filter_endDate: string | null = null;
  includePcva: boolean = false;
  includeCcva: boolean = false;
  isExporting: boolean = false;
  fieldMappingData?: FieldMapping;
  systemConfigData?: SystemConfig;
  canExportPcvaCcva: boolean = false;

  // Organization Unit selector - same tree-navigation dropdown used on the
  // Dashboard's location filter (va-filters.component.ts's
  // initLocationAccess() is the pattern this mirrors). A location-restricted
  // user only gets levels at/below their own, and the tree roots at (and
  // pre-selects) their own boundary rather than the whole country - this is
  // only a display default, though: the actual "can't export beyond what
  // you're allowed to see" enforcement is the backend's mandatory
  // access_limit filter (build_location_limit_filter in
  // export_va_records.py), applied regardless of what's selected here.
  locationTypes: LocationLevel[] = [];
  creatorBoundary: LocationSelection[] = [];
  selectedLocations: LocationSelection[] = [];
  isLoadingLocationAccess: boolean = true;

  // A plain field, recomputed only when fieldMappingData loads - NOT a
  // getter. app-custom-dropdown binds [options] straight through to
  // *ngFor; a getter returning a fresh array literal on every access looks
  // like a perpetually-changing binding to Angular's change detector and
  // trips NG0103 ("infinite change detection") - discovered live while
  // verifying this feature, same root cause as ccva-results.component.ts's
  // filterValueChoices/groupByChoices earlier this session.
  dateTypeOptions: { value: string; label: string }[] = [
    { value: 'submission_date', label: 'Submission Date' },
    { value: 'interview_date', label: 'Interview Date' },
    { value: 'death_date', label: 'Date of Death' },
  ];

  constructor(
    private dataSyncService: DataSyncService,
    private settingConfigService: SettingConfigService,
    private usersService: UsersService,
    private configService: ConfigService,
    private datePipe: DatePipe,
    private snackBar: MatSnackBar,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.initLocationAccess();
    this.authService.hasPrivilege([privileges.SETTINGS_DATA_EXPORT_PCVA_CCVA]).subscribe({
      next: (hasAccess) => { this.canExportPcvaCcva = hasAccess; },
      error: () => {}
    });
  }

  private async initLocationAccess(): Promise<void> {
    try {
      const data = await lastValueFrom(this.settingConfigService.getSettingsConfig(true));
      this.fieldMappingData = data?.field_mapping;
      this.systemConfigData = data?.system_configs;
      this.updateDateTypeOptions();

      const allLevels: LocationLevel[] = [
        { label: this.systemConfigData?.admin_level1 || '', value: this.fieldMappingData?.location_level1 || '', level: 1 },
        { label: this.systemConfigData?.admin_level2 || '', value: this.fieldMappingData?.location_level2 || '', level: 2 },
        { label: this.systemConfigData?.admin_level3 || '', value: this.fieldMappingData?.location_level3 || '', level: 3 },
        { label: this.systemConfigData?.admin_level4 || '', value: this.fieldMappingData?.location_level4 || '', level: 4 },
      ];

      const current_user = JSON.parse(localStorage.getItem('current_user') || '{}');
      const user_roles_data: any = await lastValueFrom(this.usersService.getUserRoles(current_user?.uuid));
      const access_limit = user_roles_data?.data?.access_limit;

      const legacyField: string = access_limit?.field ?? '';
      this.creatorBoundary = (access_limit?.limit_by || [])
        .map((item: any) => {
          const field = item?.field || legacyField;
          const levelDef = allLevels.find(l => l.value === field);
          return field && item?.value != null ? {
            field,
            field_label: levelDef?.label || field,
            label: item?.label || item?.value,
            value: item?.value,
          } : null;
        })
        .filter((item: any): item is LocationSelection => !!item);

      const boundaryLevels = this.creatorBoundary
        .map(b => allLevels.find(l => l.value === b.field)?.level ?? 0)
        .filter((l: number) => l > 0);
      const boundaryLevel = boundaryLevels.length ? Math.min(...boundaryLevels) : 0;

      this.locationTypes = allLevels
        .filter(l => l.label && l.value)
        .filter(l => boundaryLevel === 0 || l.level >= boundaryLevel);

      // Pre-select the user's own organization unit, per the requirement
      // that the export defaults to their own scope rather than opening on
      // an unfiltered "everything".
      if (this.creatorBoundary.length) {
        this.selectedLocations = this.creatorBoundary;
      }
    } finally {
      this.isLoadingLocationAccess = false;
    }
  }

  onLocationSelectionChange(selection: LocationSelection[]): void {
    this.selectedLocations = selection;
  }

  private updateDateTypeOptions(): void {
    const fm = this.fieldMappingData;
    const fallback = [
      { value: 'submission_date', label: 'Submission Date' },
      { value: 'interview_date', label: 'Interview Date' },
      { value: 'death_date', label: 'Date of Death' },
    ];
    if (!fm) {
      this.dateTypeOptions = fallback;
      return;
    }
    const opts: { value: string; label: string }[] = [];
    if (fm.submitted_date) opts.push({ value: 'submission_date', label: 'Submission Date' });
    if (fm.interview_date) opts.push({ value: 'interview_date', label: 'Interview Date' });
    if (fm.death_date)     opts.push({ value: 'death_date',     label: 'Date of Death' });
    this.dateTypeOptions = opts.length ? opts : fallback;
  }

  onDateInputChange(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }

  exportData(): void {
    this.isExporting = true;

    const formattedStartDate = this.filter_startDate
      ? this.datePipe.transform(this.filter_startDate, 'yyyy-MM-dd') ?? undefined
      : undefined;
    const formattedEndDate = this.filter_endDate
      ? this.datePipe.transform(this.filter_endDate, 'yyyy-MM-dd') ?? undefined
      : undefined;

    this.dataSyncService.getExportToken().subscribe({
      next: async (response) => {
        const token = response.token;
        let url = `${this.configService.API_URL}/records/export?file_format=excel`
          + `&include_pcva=${this.includePcva}&include_ccva=${this.includeCcva}`
          + `&token=${token}`;
        if (formattedStartDate) url += `&start_date=${formattedStartDate}`;
        if (formattedEndDate)   url += `&end_date=${formattedEndDate}`;
        if (this.selectedDateType) url += `&date_type=${this.selectedDateType}`;
        if (this.selectedLocations.length) {
          const locations = this.selectedLocations.map(l => ({ field: l.field, value: l.value }));
          url += `&locations=${encodeURIComponent(JSON.stringify(locations))}`;
        }

        try {
          const fetchResponse = await fetch(url);
          if (!fetchResponse.ok) {
            const errText = await fetchResponse.text().catch(() => fetchResponse.statusText);
            throw new Error(errText || `Server error ${fetchResponse.status}`);
          }
          const blob = await fetchResponse.blob();
          const filename = `va_records_export_${new Date().toISOString().split('T')[0]}.xlsx`;
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(objectUrl);
          this.snackBar.open('Export downloaded successfully', 'Close', {
            duration: 3000, horizontalPosition: 'end', verticalPosition: 'top'
          });
        } catch (err: any) {
          console.error('Export download failed:', err);
          this.snackBar.open(`Export failed: ${err?.message ?? 'Unknown error'}`, 'Close', {
            duration: 5000, horizontalPosition: 'end', verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        } finally {
          this.isExporting = false;
        }
      },
      error: () => {
        this.isExporting = false;
        this.snackBar.open('Failed to initiate export', 'Close', {
          duration: 3000, horizontalPosition: 'end', verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
