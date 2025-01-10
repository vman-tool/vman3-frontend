import { Component, OnInit } from '@angular/core';
import { CodedVaService } from '../../services/coded-va/coded-va.service';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ViewVaComponent } from 'app/shared/dialogs/view-va/view-va.component';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { CodeVaComponent } from '../../dialogs/code-va/code-va.component';

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
    public dialog: MatDialog
  ) {}
  
  ngOnInit() {
    this.current_user = JSON.parse(localStorage.getItem('current_user') || "")
    this.loadCodedVAs()
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

    onUpdateCodedVA(va: any){
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
              label: code?.name,
              value: code?.uuid,
            }
          }),
          fieldsMapping: this.fieldsMapping
        }
        this.dialog.open(CodeVaComponent, dialogConfig)
      }
  
    onPageChange(event: any) {
      this.pageNumber = event.pageIndex > 0 ? event.pageIndex + 1 : event.pageIndex;
      this.limit = Number(event?.pageSize);
      this.loadCodedVAs();
    }
}
