import { Component, OnInit } from '@angular/core';
import { CodedVaService } from '../../services/coded-va/coded-va.service';
import { catchError, lastValueFrom, map, Observable, throwError } from 'rxjs';
import { ViewVaComponent } from 'app/shared/dialogs/view-va/view-va.component';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { CodeVaComponent } from '../../dialogs/code-va/code-va.component';
import { GenericIndexedDbService } from 'app/shared/services/indexedDB/generic-indexed-db.service';
import { OBJECTSTORE_ICD10 } from 'app/shared/constants/indexedDB.constants';
import { OBJECTKEY_ICD10_INDEXDB } from 'app/shared/constants/pcva.constants';
import { settingsConfigData } from 'app/modules/settings/interface';
import { PcvaSettingsService } from 'app/modules/settings/services/pcva-settings.service';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';

@Component({
  standalone: false,
  selector: 'app-coded-va',
  templateUrl: './coded-va.component.html',
  styleUrl: './coded-va.component.scss'
})
export class CodedVaComponent implements OnInit {
  current_user: any;
  codedVas$?: Observable<any>;
  loadingData: boolean = false;
  /**
   * Fixed columns, replacing Object.keys() of the first record.
   *
   * instanceid is dropped: it and vaId are read from the same source field and
   * were always identical, so the table carried the same UUID twice.
   *
   * The ML column only appears when PCVA Configuration enables ML integration,
   * matching the coding window - a deployment that does not use ML should not
   * see an empty column asking to be explained.
   */
  columns: { key: string; label: string; truncate?: boolean; emphasise?: boolean }[] = [];
  private readonly baseColumns = [
    { key: 'vaId', label: 'VA ID', truncate: true },
    { key: 'region', label: 'Region' },
    { key: 'district', label: 'District' },
    { key: 'interviewDay', label: 'Interview Day' },
    { key: 'underlyingCause', label: 'Underlying CoD (coder)', emphasise: true },
  ];
  enableMLIntegration = false;
  
  pageNumber?: number = 0;
  pageSizeOptions = [10, 20, 50, 100]
  limit?: number;
  fieldsMapping: any;
  icdCodes: any;

  constructor(
    private pcvaSettingsService: PcvaSettingsService,
    private codedVaService: CodedVaService,
    public dialog: MatDialog,
    private genericIndexedDbService: GenericIndexedDbService,
    private settingConfigService: SettingConfigService
  ) {}
  
  ngOnInit() {
    this.current_user = JSON.parse(localStorage.getItem('current_user') || "")
    this.buildColumns()
    this.loadCodedVAs()
    this.loadSettings()
    this.loadMlFlag()
  }

  async loadSettings(){
    if(!this.icdCodes){
      const codes = await this.genericIndexedDbService.getDataObjectStore(OBJECTSTORE_ICD10, OBJECTKEY_ICD10_INDEXDB);
      this.icdCodes = codes?.value;
    }

    this.fieldsMapping ? this.fieldsMapping : this.settingConfigService.getSettingsConfig().subscribe({
      next: (response: settingsConfigData | null) => {
        if (response != null) {
          this.fieldsMapping = response.field_mapping;
          const level1 = (response as any)?.system_configs?.admin_level1;
          const level2 = (response as any)?.system_configs?.admin_level2;
          this.baseColumns.forEach(c => {
            if (c.key === 'region' && level1) { c.label = level1; }
            if (c.key === 'district' && level2) { c.label = level2; }
          });
          this.buildColumns();
        }
      },
      error: (error: any) => console.error('Error fetching settings config:', error)
    });
  }

  /** Append the ML column only when the deployment has ML integration on. */
  private buildColumns(): void {
    this.columns = this.enableMLIntegration
      ? [...this.baseColumns, { key: 'mlCause', label: 'ML Underlying CoD', truncate: true }]
      : [...this.baseColumns];
  }

  private loadMlFlag(): void {
    this.pcvaSettingsService.getPCVAConfigurations().subscribe({
      next: (response: any) => {
        this.enableMLIntegration = !!response?.data?.enableMLIntegration;
        this.buildColumns();
      },
      error: () => this.buildColumns(),
    });
  }

  loadCodedVAs() {
      this.loadingData = true
    this.codedVas$ = this.codedVaService.getCodedVARecords(
        {
          paging: true,
          page_number: this.pageNumber,
          limit: this.limit,
        },
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

    async onUpdateCodedVA(va: any){
      const codedData: any = await lastValueFrom(this.codedVaService.getCodedVADetails(undefined, false, va, this.current_user?.uuid, false));
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
          fieldsMapping: this.fieldsMapping,
          codedData: codedData?.data
        }
        this.dialog.open(CodeVaComponent, dialogConfig).afterClosed().subscribe((response: any) => {
      if(response){
        this.loadCodedVAs();
      }
    })
      }
  
    onPageChange(event: any) {
    this.pageNumber = this.pageNumber == 0 && this.pageNumber < event.pageIndex ? event.pageIndex + 1 : this.pageNumber !== 0 && this.pageNumber! > event.pageIndex ? event.pageIndex - 1 : event.pageIndex;
    this.pageNumber = this.pageNumber! < 0 ? 0 : this.pageNumber;
    this.limit = Number(event?.pageSize);
      this.loadCodedVAs();
    }
}
