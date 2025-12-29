import { Component, OnInit } from '@angular/core';
import { AllAssignedService } from '../../services/all-assigned/all-assigned.service';
import { catchError, map, Observable, throwError } from 'rxjs';
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
  selector: 'app-all-assigned',
  templateUrl: './all-assigned.component.html',
  styleUrl: './all-assigned.component.scss'
})
export class AllAssignedComponent implements OnInit {
  assignedVas$?: Observable<any>
  loadingData: boolean = false;
  headers: any;
  current_user?: any;
  
  pageNumber?: number = 0;
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

  async getVASettings() {
    // TODO: Use ICD10/ICD11 Depending on user settings.

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

  loadAssignedVas() {
    this.loadingData = true
    this.assignedVas$ = this.allAssignedService.getAssignedVARecords(
      {
        paging: true,
        page_number: this.pageNumber,
        limit: this.limit,
      },
      "false",
      undefined,
      this.current_user?.uuid
    ).pipe(
      map((response: any) => {
        if(!this.headers){
          this.headers = response?.data[0]?.vaId ? Object.keys(response?.data[0])?.filter((column: string) => column.toLowerCase() !== 'id') : []
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

  onPageChange(event: any) {
    this.pageNumber = this.pageNumber == 0 && this.pageNumber < event.pageIndex ? event.pageIndex + 1 : this.pageNumber !== 0 && this.pageNumber! > event.pageIndex ? event.pageIndex - 1 : event.pageIndex;
    this.pageNumber = this.pageNumber! < 0 ? 0 : this.pageNumber;
    this.limit = Number(event?.pageSize);
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
  
  onCodeVA(va: any){
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
