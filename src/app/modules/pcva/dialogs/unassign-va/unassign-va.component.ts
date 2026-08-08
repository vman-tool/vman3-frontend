import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { VaRecordsService } from '../../services/va-records/va-records.service';
import { catchError, lastValueFrom, map, Observable } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';

/** One column of the record table. `key` indexes the formatted VA record. */
interface UnassignColumn {
  key: string;
  label: string;
  truncate?: boolean;
  align?: 'left' | 'center';
}

@Component({
  standalone: false,
  selector: 'app-unassign-va',
  templateUrl: './unassign-va.component.html',
  styleUrl: './unassign-va.component.scss'
})
export class UnassignVaComponent implements OnInit, AfterViewInit {
  vaRecords$?: Observable<any>
  pageNumber: number = 0;
  pageSizeOptions = [10, 20, 50, 100]
  limit: number = 10;
  paging?: boolean;
  coder: any;
  loadingData: boolean = false;
  selectedVAs: string[] = []
  reloadOnClose: boolean = false;
  isUnassigning = false;

  /**
   * Fixed columns, matching the assign dialog.
   *
   * The two location labels are replaced with the deployment's configured
   * admin level names - a country may call level 1 a Region, a Division or a
   * County, so nothing here may assume one country's naming.
   */
  columns: UnassignColumn[] = [
    { key: 'vaId', label: 'VA ID', truncate: true },
    { key: 'region', label: 'Region' },
    { key: 'district', label: 'District' },
    { key: 'interviewDay', label: 'Interview Day' },
    { key: 'interviewerName', label: 'Interviewer', truncate: true },
    { key: 'assignments', label: 'Assignments', align: 'center' },
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private matDialogRef: MatDialogRef<UnassignVaComponent>,
    private vaRecordsService: VaRecordsService,
    private settingConfigService: SettingConfigService,
    private snackBar: MatSnackBar
  ) {
    this.coder = data?.coder
  }

  ngOnInit(): void {
    this.loadVARecords();
    this.loadLabels();
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

  trackByVa(_index: number, va: any): string {
    return va?.instanceid;
  }

  /** Display names for the admin levels, from system configuration. */
  private async loadLabels(): Promise<void> {
    try {
      const config: any = await lastValueFrom(this.settingConfigService.getSettingsConfig());
      const level1 = config?.system_configs?.admin_level1;
      const level2 = config?.system_configs?.admin_level2;
      if (level1) {
        this.columns = this.columns.map(c => c.key === 'region' ? { ...c, label: level1 } : c);
      }
      if (level2) {
        this.columns = this.columns.map(c => c.key === 'district' ? { ...c, label: level2 } : c);
      }
    } catch {
      // Keep the defaults if configuration cannot be read.
    }
  }

  /**
   * No filters here, unlike the assign dialog: the endpoint already returns
   * only what this coder currently holds and has not yet coded, so the list is
   * narrow by construction. You can only unassign what was assigned.
   */
  async loadVARecords() {
    this.loadingData = true
    this.vaRecords$ = this.vaRecordsService.getUncodedAssignedVARecords(
      {
        paging: this.paging,
        // page_number is 1-based on the server, where offset is computed as
        // (page_number - 1) * limit. Sending the raw 0-based page index made
        // that offset negative, and AQL SLICE reads a negative offset from the
        // end of the result - so the first page showed the last records.
        page_number: this.pageNumber + 1,
        limit: this.limit
      },
      this.coder?.uuid
    ).pipe(
      map((response: any) => {
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

  // ── Selection ─────────────────────────────────────────────────────────────

  isSelected(va: any): boolean {
    return this.selectedVAs.includes(va?.instanceid);
  }

  /** Row click and checkbox share one path, so they cannot disagree. */
  toggleVA(va: any): void {
    const id = va?.instanceid;
    if (!id) { return; }
    this.selectedVAs = this.selectedVAs.includes(id)
      ? this.selectedVAs.filter(v => v !== id)
      : [...this.selectedVAs, id];
  }

  private pageIds(records: any[]): string[] {
    return (records ?? []).map(va => va?.instanceid).filter(Boolean);
  }

  allSelected(records: any[]): boolean {
    const ids = this.pageIds(records);
    return ids.length > 0 && ids.every(id => this.selectedVAs.includes(id));
  }

  toggleAll(records: any[]): void {
    const ids = this.pageIds(records);
    this.selectedVAs = this.allSelected(records)
      ? this.selectedVAs.filter(id => !ids.includes(id))
      : Array.from(new Set([...this.selectedVAs, ...ids]));
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  onUnassignVA(): void {
    if (!this.selectedVAs.length) {
      this.notificationMessage('Select at least one VA record to unassign.');
      return;
    }

    this.isUnassigning = true;
    this.vaRecordsService.unassignVARecords({
      vaIds: this.selectedVAs,
      coder: this.coder?.uuid
    }).subscribe({
      next: () => {
        this.notificationMessage(
          `Unassigned ${this.selectedVAs.length} VA record(s) from ${this.coder?.name}.`
        );
        this.reloadOnClose = true;
        this.selectedVAs = [];
        this.isUnassigning = false;
        this.loadVARecords();
      },
      error: (error: any) => {
        this.isUnassigning = false;
        this.notificationMessage(
          error?.error?.detail ?? 'Failed to unassign the selected records.', 'center', undefined, 5000
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
