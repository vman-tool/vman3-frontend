import { Component, OnInit } from '@angular/core';
import { CodersService } from '../../services/coders/coders.service';
import { catchError, map, Observable } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { AssignVaComponent } from '../../dialogs/assign-va/assign-va.component';
import { UnassignVaComponent } from '../../dialogs/unassign-va/unassign-va.component';

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
    this.dialog.open(AssignVaComponent, dialogConfig).afterClosed().subscribe((result: any) => {
      if(result){
        this.getCoders();
      }
    })
  }
  
  onUnassignCoder(e: Event, coder: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "80vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      coder: coder
    }
    this.dialog.open(UnassignVaComponent, dialogConfig).afterClosed().subscribe((result: any) => {
      if(result){
        this.getCoders();
      }
    })
  }

  onPageChange(event: any) {
    this.pageNumber = this.pageNumber == 0 && this.pageNumber < event.pageIndex ? event.pageIndex + 1 : this.pageNumber !== 0 && this.pageNumber! > event.pageIndex ? event.pageIndex - 1 : event.pageIndex;
    this.pageNumber = this.pageNumber! < 0 ? 0 : this.pageNumber;
    this.limit = Number(event?.pageSize);
    this.getCoders();
  }

}
