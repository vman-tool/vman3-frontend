import { Component, OnInit } from '@angular/core';
import { AllAssignedService } from '../../services/all-assigned/all-assigned.service';
import { catchError, map, Observable, throwError, lastValueFrom } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ViewVaComponent } from '../../../../shared/dialogs/view-va/view-va.component';
import { CodeVaComponent } from '../../dialogs/code-va/code-va.component';
import { PcvaSettingsService } from 'app/modules/settings/services/pcva-settings.service';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { FieldMapping, settingsConfigData } from 'app/modules/settings/interface';
import { GenericIndexedDbService } from 'app/shared/services/indexedDB/generic-indexed-db.service';
import { OBJECTSTORE_ICD10 } from 'app/shared/constants/indexedDB.constants';
import { OBJECTKEY_ICD10_INDEXDB } from 'app/shared/constants/pcva.constants';

@Component({
  standalone: false,
  selector: 'app-all-assigned',
  templateUrl: './all-assigned.component.html',
  styleUrl: './all-assigned.component.scss'
})
export class AllAssignedComponent implements OnInit {
  assignedVas$?: Observable<any>
  loadingData: boolean = false;
  current_user?: any;

  /**
   * Fixed columns, replacing Object.keys() of the first record.
   *
   * "Assignments" and "Coders" are deliberately absent: this table shows a
   * coder their own workload, and how many other people hold the same record
   * is neither their business nor useful to them. Dropping them also removes
   * the two widest columns, which is what let the rest fit without scrolling.
   *
   * The two location labels follow the deployment's configured admin levels.
   */
  columns: { key: string; label: string; truncate?: boolean }[] = [
    { key: 'vaId', label: 'VA ID', truncate: true },
    { key: 'region', label: 'Region' },
    { key: 'district', label: 'District' },
    { key: 'interviewDay', label: 'Interview Day' },
    { key: 'interviewerName', label: 'Interviewer', truncate: true },
  ];

  pageNumber: number = 0;
  pageSizeOptions = [10, 20, 50, 100]
  limit?: number;
  paging?: boolean;
  icdCodes?: any;
  fieldsMapping?: FieldMapping;

  constructor(
    private allAssignedService: AllAssignedService, 
    public dialog: MatDialog,
    private pcvaSettingsService: PcvaSettingsService,
    private settingConfigService: SettingConfigService,
    private genericIndexedDbService: GenericIndexedDbService
  ){}

  ngOnInit(): void {
    this.current_user = JSON.parse(localStorage.getItem('current_user') || '{}');
    this.loadAssignedVas();
    this.getVASettings();
  }

  async getVASettings(): Promise<void> {
    // TODO: Use ICD10/ICD11 depending on user settings.
    if (!this.icdCodes) {
      const codes = await this.genericIndexedDbService.getDataObjectStore(OBJECTSTORE_ICD10, OBJECTKEY_ICD10_INDEXDB);
      this.icdCodes = codes?.value;
    }

    if (!this.fieldsMapping) {
      try {
        const response = await lastValueFrom(this.settingConfigService.getSettingsConfig());
        if (response != null) {
          this.fieldsMapping = response.field_mapping;
          const level1 = (response as any)?.system_configs?.admin_level1;
          const level2 = (response as any)?.system_configs?.admin_level2;
          if (level1) { this.columns = this.columns.map(c => c.key === 'region' ? { ...c, label: level1 } : c); }
          if (level2) { this.columns = this.columns.map(c => c.key === 'district' ? { ...c, label: level2 } : c); }
        }
      } catch (error: any) {
        console.error('Error fetching settings config:', error);
      }
    }
  }

  loadAssignedVas() {
    this.loadingData = true
    this.assignedVas$ = this.allAssignedService.getAssignedVARecords(
      {
        paging: true,
        page_number: this.pageNumber + 1,
        limit: this.limit,
      },
      "false",
      undefined,
      this.current_user?.uuid
    ).pipe(
      map((response: any) => {
        this.loadingData = false
        return response;
      }),
      catchError((error: any) => {
        this.loadingData = false
        return throwError(() => error);
      })
    )
  }

  onPageChange(event: any) {
    this.pageNumber = event?.pageIndex ?? 0;
    this.limit = Number(event?.pageSize ?? this.limit);
    this.loadAssignedVas();
  }

  onOpenVA(va: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "95vw";
    dialogConfig.height = "90vh";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      va: va,
    }
    this.dialog.open(ViewVaComponent, dialogConfig)
  }
  
  async onCodeVA(va: any){
    await this.getVASettings();

    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "95vw";
    dialogConfig.height = "90vh";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      va: va,
      current_user: this.current_user,
      icdCodes: this.icdCodes?.map((code: any) => {
        return {
          label: `${code?.code} - ${code?.name}`,
          value: code?.uuid,
        }
      }),
      fieldsMapping: this.fieldsMapping
    }
    this.dialog.open(CodeVaComponent, dialogConfig).afterClosed().subscribe((response: any) => {
      if(response){
        this.loadAssignedVas();
      }
    })
  }

}
