import { Component, OnInit } from '@angular/core';
import { DiscordantsVaService } from '../../services/discordants-va/discordants-va.service';
import { GenericIndexedDbService } from 'app/shared/services/indexedDB/generic-indexed-db.service';
import { SettingConfigService } from 'app/modules/settings/services/settings_configs.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { catchError, lastValueFrom, map, Observable, throwError } from 'rxjs';
import { ViewVaComponent } from 'app/shared/dialogs/view-va/view-va.component';
import { CodeVaComponent } from '../../dialogs/code-va/code-va.component';
import { settingsConfigData } from 'app/modules/settings/interface';
import { OBJECTSTORE_ICD10 } from 'app/shared/constants/indexedDB.constants';
import { OBJECTKEY_ICD10_INDEXDB } from 'app/shared/constants/pcva.constants';
import { MatSnackBar } from '@angular/material/snack-bar';
import { assign_coder_chat_name } from '../../helpers/discordants-chats.helpers';

@Component({
  selector: 'app-discordants-va',
  templateUrl: './discordants-va.component.html',
  styleUrl: './discordants-va.component.scss'
})
export class DiscordantsVaComponent implements OnInit {
  discordantsVAs$?: Observable<any>;
  current_user: any;
  loadingData: boolean = false;
  headers?: string[];
  fieldsMapping: any;
  icdCodes: any;

  pageNumber?: number = 0;
  pageSizeOptions = [10, 20, 50, 100]
  limit?: number = 10;


  constructor(
      private discordantsVaService: DiscordantsVaService,
      public dialog: MatDialog,
      private genericIndexedDbService: GenericIndexedDbService,
      private settingConfigService: SettingConfigService,
      private snackBar: MatSnackBar
    ) {}

   notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }


  ngOnInit(){
    this.current_user = JSON.parse(localStorage.getItem('current_user') || "")
    this.loadDiscordants()
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
    
  loadDiscordants() {
    this.loadingData = true
    this.discordantsVAs$ = this.discordantsVaService.getDiscordants(
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

    async onResolveDiscorant(va: any){
      const discordantData: any = await lastValueFrom(this.discordantsVaService.getDiscordantMessages(va));
      if(discordantData?.data?.discordant){
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
          codedData: discordantData?.data?.discordant,
          messages: discordantData?.data?.messages,
          coders: assign_coder_chat_name(discordantData?.data?.coders),
          allowChat: true
        }
        this.dialog.open(CodeVaComponent, dialogConfig).afterClosed().subscribe((response: any) => {
          if(response){
            this.loadDiscordants();
          }
        })
      }
    }

    onPageChange(event: any) {
    this.pageNumber = this.pageNumber == 0 && this.pageNumber < event.pageIndex ? event.pageIndex + 1 : this.pageNumber !== 0 && this.pageNumber! > event.pageIndex ? event.pageIndex - 1 : event.pageIndex;
    this.pageNumber = this.pageNumber! < 0 ? 0 : this.pageNumber;
    this.limit = Number(event?.pageSize);
      this.loadDiscordants();
    }

}
