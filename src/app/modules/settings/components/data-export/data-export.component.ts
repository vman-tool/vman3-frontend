import { Component, OnInit } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { DatePipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataSyncService } from '../../services/data_sync.service';
import { SettingConfigService } from '../../services/settings_configs.service';
import { FieldMapping } from '../../interface';
import { ConfigService } from 'app/app.service';
import { AuthService } from 'app/core/services/authentication/auth.service';
import * as privileges from 'app/shared/constants/privileges.constants';

@Component({
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
  canExportPcvaCcva: boolean = false;

  constructor(
    private dataSyncService: DataSyncService,
    private settingConfigService: SettingConfigService,
    private configService: ConfigService,
    private datePipe: DatePipe,
    private snackBar: MatSnackBar,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.settingConfigService.getSettingsConfig(true).subscribe({
      next: (data) => { if (data) this.fieldMappingData = data.field_mapping; },
      error: () => {}
    });
    this.authService.hasPrivilege([privileges.SETTINGS_DATA_EXPORT_PCVA_CCVA]).subscribe({
      next: (hasAccess) => { this.canExportPcvaCcva = hasAccess; },
      error: () => {}
    });
  }

  get dateTypeOptions(): { value: string; label: string }[] {
    const fm = this.fieldMappingData;
    const opts: { value: string; label: string }[] = [];
    if (!fm) {
      return [
        { value: 'submission_date', label: 'Submission Date' },
        { value: 'interview_date', label: 'Interview Date' },
        { value: 'death_date', label: 'Date of Death' },
      ];
    }
    if (fm.submitted_date) opts.push({ value: 'submission_date', label: 'Submission Date' });
    if (fm.interview_date) opts.push({ value: 'interview_date', label: 'Interview Date' });
    if (fm.death_date)     opts.push({ value: 'death_date',     label: 'Date of Death' });
    return opts.length ? opts : [
      { value: 'submission_date', label: 'Submission Date' },
      { value: 'interview_date', label: 'Interview Date' },
      { value: 'death_date',     label: 'Date of Death' },
    ];
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
