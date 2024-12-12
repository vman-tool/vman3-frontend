import { Component, OnInit } from '@angular/core';
import { CodersService } from '../../services/coders/coders.service';
import { catchError, map, Observable } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { AssignVaComponent } from '../../dialogs/assign-va/assign-va.component';

@Component({
  selector: 'app-coders',
  templateUrl: './coders.component.html',
  styleUrl: './coders.component.scss'
})
export class CodersComponent implements OnInit {
  
  codersData$?: Observable<any>;
  loadingData: boolean = false;

  pageNumber?: number = 0;
  pageSizeOptions = [10, 20, 50, 100]
  limit?: number;
  paging?: boolean;
  
  constructor(
    private codersService: CodersService,
    public dialog: MatDialog,
  ){}

  ngOnInit(): void {
    this.getCoders(); 
  }

  getCoders(){
    this.loadingData = true
    this.codersData$ = this.codersService.getCoders(undefined, false).pipe(
      map((response) => {
        this.loadingData = false
        return response;
      }),
      catchError((error: any) => {
        this.loadingData = false
        return error;
      })
    );
  }

  onAssignCoder(e: Event, coder: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "80vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      coder: coder
    }
    this.dialog.open(AssignVaComponent, dialogConfig)
  }

  onPageChange(event: any) {
    this.pageNumber = event.pageIndex > 0 ? event.pageIndex + 1 : event.pageIndex;
    this.limit = Number(event?.pageSize);
    this.getCoders();
  }

}
