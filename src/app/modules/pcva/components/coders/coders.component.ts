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
  
  constructor(
    private codersService: CodersService,
    public dialog: MatDialog,
  ){}

  ngOnInit(): void {
    this.loadingData = true
    this.codersData$ = this.codersService.getCoders(true).pipe(
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

}
