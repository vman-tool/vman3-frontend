import { Component, OnInit } from '@angular/core';
import { AllAssignedService } from '../../services/all-assigned/all-assigned.service';
import { catchError, map, Observable } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ViewVaComponent } from '../../dialogs/view-va/view-va.component';

@Component({
  selector: 'app-all-assigned',
  templateUrl: './all-assigned.component.html',
  styleUrl: './all-assigned.component.scss'
})
export class AllAssignedComponent implements OnInit {
  assignedVas$?: Observable<any>
  loadingData: boolean = false;
  headers: any;
  
  pageNumber?: number = 0;
  pageSizeOptions = [10, 20, 50, 100]
  limit?: number;
  paging?: boolean;

  constructor(private allAssignedService: AllAssignedService, public dialog: MatDialog){}

  ngOnInit(): void {
    this.loadAssignedVas();
  }

  loadAssignedVas() {
    this.loadingData = true
    const current_user = JSON.parse(localStorage.getItem('current_user') || '{}');
    this.assignedVas$ = this.allAssignedService.getAssignedVARecords(
      {
        paging: true,
        page_number: this.pageNumber,
        limit: this.limit,
      },
      "false",
      undefined,
      current_user?.uuid
    ).pipe(
      map((response: any) => {
        if(!this.headers){
          this.headers = Object.keys(response?.data[0]?.vaId)
        }

        // TODO: Add total records for pagination to work 
        
        this.loadingData = false
       return response;
      }),
      catchError((error: any) => {
        this.loadingData = false
        return error;
      })
    )
  }

  onPageChange(event: any) {
    this.pageNumber = event.pageIndex > 0 ? event.pageIndex + 1 : event.pageIndex;
    this.limit = Number(event?.pageSize);
    this.loadAssignedVas();
  }

  onOpenVA(va: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "80vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      va: va
    }
    this.dialog.open(ViewVaComponent, dialogConfig)
  }

}
