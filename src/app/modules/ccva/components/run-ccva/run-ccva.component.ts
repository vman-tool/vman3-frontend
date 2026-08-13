import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { CcvaRunStateService } from '../../services/ccva-run-state.service';
import { SettingConfigService } from '../../../settings/services/settings_configs.service';
import { FieldMapping } from '../../../settings/interface';

@Component({
  standalone: false,
  selector: 'app-run-ccva',
  templateUrl: './run-ccva.component.html',
  styleUrls: ['./run-ccva.component.scss'],
})
export class RunCcvaComponent implements OnInit, OnDestroy {
  filter_startDate: any;
  filter_endDate: any;

  dateRangeOption: string = '200'; // 'all' or 'custom'
  selectedDateType = 'death_date';
  malariaStatus: string = 'h'; // Default value
  ccvaAlgorithm: string = 'InterVA5'; // Default value
  hivStatus: string = 'h'; // Default value
  // 1.0 used to be the default here, but the backend's check is
  // `fraction_of_dk_answers > dkThreshold` - a fraction can never exceed
  // 1.0, so that default silently disabled the missing-data safety net
  // entirely. 0.60 matches the floor CCVAPredictor itself enforces
  // (prediction.py: "DK threshold: enforce a minimum of 0.60... genuinely
  // unusable" below that), which is also what a record gets by default on
  // the individual PCVA ML-analysis path - keeping both paths consistent.
  dkThreshold: number = 0.60;
  oodThreshold: number = 0.05;

  dataSource: 'available' | 'csv' = 'available';
  selectedFile: File | null = null;
  isLogsExpanded: boolean = true;
  fieldMappingData?: FieldMapping;
  dateTypeOptions: { value: string; label: string }[] = [
    { value: 'submission_date', label: 'Submission Date' },
    { value: 'death_date', label: 'Date of Death' },
    { value: 'interview_date', label: 'Interview Date' },
  ];

  // Run progress/state is owned by CcvaRunStateService (app-lifetime
  // singleton) so it survives navigating away from and back to this page -
  // see that service's class comment for why.
  runState$;

  @ViewChild('logsContainer') private logsContainer: ElementRef | undefined;
  private logsLength = 0;
  private stateSubscription: Subscription | undefined;

  constructor(
    private ccvaRunStateService: CcvaRunStateService,
    private settingConfigService: SettingConfigService
  ) {
    this.runState$ = this.ccvaRunStateService.state$;
  }

  private computeDateTypeOptions(): void {
    const fm = this.fieldMappingData;
    if (!fm) return;
    const opts: { value: string; label: string }[] = [];
    if (fm.submitted_date) opts.push({ value: 'submission_date', label: 'Submission Date' });
    if (fm.death_date) opts.push({ value: 'death_date', label: 'Date of Death' });
    if (fm.interview_date) opts.push({ value: 'interview_date', label: 'Interview Date' });
    if (opts.length) this.dateTypeOptions = opts;
  }

  ngOnInit(): void {
    this.settingConfigService.getSettingsConfig(true).subscribe({
      next: (data) => {
        if (data) {
          this.fieldMappingData = data.field_mapping;
          this.computeDateTypeOptions();
        }
      },
      error: () => { /* use fallback options */ }
    });

    // Auto-scroll the logs panel as new entries arrive. Purely presentational,
    // unrelated to the run state itself - kept as a subscription (rather than
    // the async pipe used in the template) only because it needs a side
    // effect (DOM scroll) after each emission.
    this.stateSubscription = this.runState$.subscribe((state) => {
      if (state.logs.length !== this.logsLength) {
        this.logsLength = state.logs.length;
        this.scrollToBottom();
      }
    });
  }

  ngOnDestroy(): void {
    this.stateSubscription?.unsubscribe();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.logsContainer) {
          this.logsContainer.nativeElement.scrollTop = this.logsContainer.nativeElement.scrollHeight;
        }
      } catch (err) { }
    }, 100);
  }

  onDataSourceChange() {
    if (this.dataSource === 'available') {
      this.selectedFile = null;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onDateRangeChange() {
    if (this.dateRangeOption === 'all') {
      this.filter_startDate = null;
      this.filter_endDate = null;
    }
  }

  onCancel() {
    this.ccvaRunStateService.cancelRun();
  }

  clearLogs() {
    this.ccvaRunStateService.clearLogs();
  }

  onRunCCVA() {
    // Prepare filter object based on the selected options
    const filter: any = {
      start_date: this.dateRangeOption === 'custom' ? this.filter_startDate : null,
      end_date: this.dateRangeOption === 'custom' ? this.filter_endDate : null,
      top: this.dateRangeOption === '200' ? 200 : null,
      malaria_status: this.malariaStatus,
      ccva_algorithm: this.ccvaAlgorithm,
      hiv_status: this.hivStatus,
      date_type: this.selectedDateType,
    };
    if (this.ccvaAlgorithm === 'VManML10') {
      filter['dk_threshold'] = this.dkThreshold;
      filter['ood_threshold'] = this.oodThreshold;
    }

    if (this.dataSource === 'csv') {
      if (!this.selectedFile) {
        console.error('No file selected');
        return;
      }
      const formData = new FormData();
      formData.append('file', this.selectedFile);
      Object.keys(filter).forEach((key) => {
        if (filter[key] !== null) {
          formData.append(key, filter[key]);
        }
      });
      this.ccvaRunStateService.startRunWithCSV(formData);
    } else {
      this.ccvaRunStateService.startRun(filter);
    }
  }
}
