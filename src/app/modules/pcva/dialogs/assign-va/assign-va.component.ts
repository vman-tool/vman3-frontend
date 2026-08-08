import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { VaRecordsService } from '../../services/va-records/va-records.service';
import { catchError, lastValueFrom, map, Observable } from 'rxjs';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { CodersService } from '../../services/coders/coders.service';

/** One column of the record table. `key` indexes the formatted VA record. */
interface AssignColumn {
  key: string;
  label: string;
  /** Long identifiers are truncated in the cell and shown in full on hover. */
  truncate?: boolean;
  align?: 'left' | 'center';
}

@Component({
  standalone: false,
  selector: 'app-assign-va',
  templateUrl: './assign-va.component.html',
  styleUrl: './assign-va.component.scss'
})
export class AssignVaComponent implements OnInit, AfterViewInit {

  vaRecords$?: Observable<any>
  pageNumber?: number = 0;
  pageSizeOptions = [10, 20, 50, 100]
  limit: number = 10;
  paging?: boolean;
  coder: any;
  loadingData: boolean = false;
  selectedVAs: string[] = []
  reloadOnClose: boolean = false;
  isAssigning = false;

  /**
   * Fixed columns, rather than Object.keys() of the first record.
   *
   * The API returns id, vaId, region, district, interviewDay, interviewerName,
   * instanceid, assignments and coders. Rendering all of them meant three
   * UUID-ish columns side by side - and vaId and instanceid are read from the
   * same source field, so one of them was a duplicate - which is what forced
   * the table to scroll horizontally.
   */
  // Not readonly: the two location labels follow the deployment's configured
  // admin levels. A country may map level 1 to Region, Division, County or
  // anything else, so nothing here may assume Tanzania's naming.
  columns: AssignColumn[] = [
    { key: 'vaId', label: 'VA ID', truncate: true },
    { key: 'region', label: 'Region' },
    { key: 'district', label: 'District' },
    { key: 'interviewDay', label: 'Interview Day' },
    { key: 'interviewerName', label: 'Interviewer', truncate: true },
    { key: 'assignments', label: 'Assignments', align: 'center' },
  ];

  // ── Filters ───────────────────────────────────────────────────────────────
  // Applied server-side, so they narrow the whole result set rather than the
  // page currently on screen - assigning "all of Arusha" has to mean all of it.
  locationOptions: { value: string; label: string }[] = [];
  /** Configured name of the level-1 admin unit, e.g. Region, Division. */
  locationLabel = 'Location';
  readonly dataSourceOptions = [
    { value: '', label: 'All data' },
    { value: 'odk_api', label: 'API Synchronized' },
    { value: 'uploaded_csv', label: 'File Upload' },
  ];

  /**
   * Coders whose existing workload can be used as a filter.
   *
   * A VA may be held by several coders, so "show me what coder 1 has" is a
   * legitimate way to build a batch for coder 2. The coder being assigned to
   * is left out of the list: the server already excludes records they hold, so
   * picking them would always return nothing.
   */
  coderOptions: { value: string; label: string }[] = [];

  filterLocation = '';
  filterDataSource = '';
  filterAssignedTo = '';
  filterStartDate = '';
  filterEndDate = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private matDialogRef: MatDialogRef<AssignVaComponent>,
    private vaRecordsService: VaRecordsService,
    private settingConfigService: SettingConfigService,
    private codersService: CodersService,
    private snackBar: MatSnackBar
  ) {
    this.coder = data?.coder
  }

  ngOnInit(): void {
    this.loadVARecords();
    this.loadLocationOptions();
    this.loadCoderOptions();
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '92vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
      (dialogElement as HTMLElement).style.borderRadius = '5px';
    }
  }

  notificationMessage(message: string, horizontal: MatSnackBarHorizontalPosition = "end", vertical: MatSnackBarVerticalPosition = "top", duration: number = 3000): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: horizontal,
      verticalPosition: vertical,
      duration: duration,
    });
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  /**
   * Populate the location dropdown from the values actually present in the
   * data, for whichever field the deployment has mapped to level 1.
   */
  private async loadLocationOptions(): Promise<void> {
    try {
      const config: any = await lastValueFrom(this.settingConfigService.getSettingsConfig());

      // Labels come from system_configs, the field to query from
      // field_mapping. The two are set independently, so a deployment can
      // call level 1 "Division" while it maps to whatever column the country's
      // xForm happens to use.
      const level1 = config?.system_configs?.admin_level1;
      const level2 = config?.system_configs?.admin_level2;
      if (level1) {
        this.locationLabel = level1;
        this.columns = this.columns.map(c => c.key === 'region' ? { ...c, label: level1 } : c);
      }
      if (level2) {
        this.columns = this.columns.map(c => c.key === 'district' ? { ...c, label: level2 } : c);
      }

      const field = config?.field_mapping?.location_level1;
      if (!field) { return; }

      const response: any = await lastValueFrom(
        this.settingConfigService.getUniqueValuesOfField(field)
      );
      const values: string[] = (response?.data ?? []).filter((v: any) => !!v);

      this.locationOptions = [
        { value: '', label: 'All locations' },
        ...values.sort().map(value => ({ value, label: value })),
      ];
    } catch (error) {
      // Not fatal: without options the filter simply stays on "All locations".
      console.error('Could not load location options:', error);
      this.locationOptions = [{ value: '', label: 'All locations' }];
    }
  }

  private async loadCoderOptions(): Promise<void> {
    try {
      const response: any = await lastValueFrom(this.codersService.getCoders(undefined, false));
      this.coderOptions = [
        { value: '', label: 'Any coder' },
        ...(response?.data ?? [])
          .filter((c: any) => c?.uuid && c.uuid !== this.coder?.uuid)
          .map((c: any) => ({ value: c.uuid, label: c.name })),
      ];
    } catch (error) {
      console.error('Could not load coders:', error);
      this.coderOptions = [{ value: '', label: 'Any coder' }];
    }
  }

  get hasActiveFilters(): boolean {
    return !!(this.filterLocation || this.filterDataSource || this.filterAssignedTo
      || this.filterStartDate || this.filterEndDate);
  }

  applyFilters(): void {
    // Back to the first page: the filtered set is a different set, and holding
    // the old page number would land the user on an empty one.
    this.pageNumber = 0;
    this.selectedVAs = [];
    this.loadVARecords();
  }

  clearFilters(): void {
    this.filterLocation = '';
    this.filterDataSource = '';
    this.filterAssignedTo = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.applyFilters();
  }

  // ── Records ───────────────────────────────────────────────────────────────

  async loadVARecords() {
    this.loadingData = true
    this.vaRecords$ = this.vaRecordsService.getUnassignedVARecords(
      {
        paging: this.paging,
        page_number: this.pageNumber != null ? this.pageNumber + 1 : undefined,
        limit: this.limit
      },
      this.coder?.uuid,
      {
        location: this.filterLocation || undefined,
        data_source: this.filterDataSource || undefined,
        assigned_to: this.filterAssignedTo || undefined,
        start_date: this.filterStartDate || undefined,
        end_date: this.filterEndDate || undefined,
      }
    ).pipe(
      map((response: any) => {
        // Each record already carries its `coders`, so whether it is assigned
        // to this coder is read straight off the row (isAssignedToCoder) - the
        // old lookup map built from the last response key is not needed.
        this.loadingData = false
        return response
      }),
      catchError((error: any) => {
        this.loadingData = false;
        this.notificationMessage(error?.error?.detail ?? error?.message ?? "Failed to load VA records. Please try again later.", "center", undefined, 5000);
        return [];
      })
    )
  }

  /** True when this coder is already assigned the record. */
  isAssignedToCoder(va: any): boolean {
    return (va?.coders ?? []).some((c: any) => c?.uuid === this.coder?.uuid);
  }

  isSelected(va: any): boolean {
    return this.selectedVAs.includes(va?.instanceid) || this.isAssignedToCoder(va);
  }

  /** Row click and checkbox share one path, so they can never disagree. */
  toggleVA(va: any): void {
    if (this.isAssignedToCoder(va)) { return; }
    const id = va?.instanceid;
    if (!id) { return; }
    this.selectedVAs = this.selectedVAs.includes(id)
      ? this.selectedVAs.filter(v => v !== id)
      : [...this.selectedVAs, id];
  }

  /** Selectable rows are those not already assigned to this coder. */
  private selectableIds(records: any[]): string[] {
    return (records ?? [])
      .filter(va => !this.isAssignedToCoder(va))
      .map(va => va?.instanceid)
      .filter(Boolean);
  }

  allSelected(records: any[]): boolean {
    const ids = this.selectableIds(records);
    return ids.length > 0 && ids.every(id => this.selectedVAs.includes(id));
  }

  toggleAll(records: any[]): void {
    const ids = this.selectableIds(records);
    this.selectedVAs = this.allSelected(records)
      ? this.selectedVAs.filter(id => !ids.includes(id))
      : Array.from(new Set([...this.selectedVAs, ...ids]));
  }

  onAssignVA(): void {
    if (!this.selectedVAs.length) {
      this.notificationMessage('Select at least one VA record to assign.');
      return;
    }

    this.isAssigning = true;
    this.vaRecordsService.assignVARecords({
      vaIds: this.selectedVAs,
      coder: this.coder?.uuid
    }).subscribe({
      next: () => {
        this.notificationMessage(
          `Assigned ${this.selectedVAs.length} VA record(s) to ${this.coder?.name}.`
        );
        this.reloadOnClose = true;
        this.selectedVAs = [];
        this.isAssigning = false;
        this.loadVARecords()
      },
      error: (error: any) => {
        this.isAssigning = false;
        this.notificationMessage(
          error?.error?.detail ?? 'Failed to assign the selected records.', 'center', undefined, 5000
        );
        console.error(error)
      }
    })
  }

  onPageChange(event: any) {
    this.pageNumber = event?.pageIndex ?? 0;
    this.limit = Number(event?.pageSize ?? this.limit);
    this.loadVARecords();
  }

  onClose() {
    this.matDialogRef.close(this.reloadOnClose);
  }
}
