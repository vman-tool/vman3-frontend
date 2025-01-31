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
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';

@Component({
  selector: 'app-coded-va',
  templateUrl: './coded-va.component.html',
  styleUrl: './coded-va.component.scss'
})
export class CodedVaComponent implements OnInit {
  current_user: any;
  codedVas$?: Observable<any>;
  loadingData: boolean = false;
  headers?: string[];
  
  pageNumber?: number = 0;
  pageSizeOptions = [10, 20, 50, 100]
  limit?: number;
  fieldsMapping: any;
  icdCodes: any;

  constructor(
    private codedVaService: CodedVaService,
    public dialog: MatDialog,
    private genericIndexedDbService: GenericIndexedDbService,
    private settingConfigService: SettingConfigService
  ) {}
  
  ngOnInit() {
    this.current_user = JSON.parse(localStorage.getItem('current_user') || "")
    this.loadCodedVAs()
    this.loadSettings()
  }

  async loadSettings(){
    if(!this.icdCodes){
      const codes = await this.genericIndexedDbService.getDataObjectStore(OBJECTSTORE_ICD10, OBJECTKEY_ICD10_INDEXDB);
      this.icdCodes = codes?.value;
    }

    this.fieldsMapping ? this.fieldsMapping : this.settingConfigService.getSettingsConfig().subscribe({
      next: (response: settingsConfigData | null) => {
        if (response != null) {
          this.fieldsMapping = response.field_mapping
        }
      },
      error: (error: any) => console.error('Error fetching settings config:', error)
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
          if(!this.headers){
            this.headers = response?.data[0]?.vaId ? Object.keys(response?.data[0])?.filter((column: string) => column.toLowerCase() !== 'id' && column.toLowerCase() !== 'assignments') : []
          }
  
          // TODO: Add total records for pagination to work 
          
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
              label: `(${code?.code}) ${code?.name}`,
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
      this.pageNumber = event.pageIndex > 0 ? event.pageIndex + 1 : event.pageIndex;
      this.limit = Number(event?.pageSize);
      this.loadCodedVAs();
    }
}
