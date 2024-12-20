import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, Observable } from 'rxjs';
import { PcvaSettingsService } from '../../services/pcva-settings.service';
import { AddIcd10CodesComponent } from '../../dialogs/add-icd10-codes/add-icd10-codes.component';

@Component({
  selector: 'app-icd-10-codes',
  templateUrl: './icd-10-codes.component.html',
  styleUrl: './icd-10-codes.component.scss'
})
export class Icd10CodesComponent implements OnInit {
  
  icd10Data$?: Observable<any>;
  loadingData: boolean = false;
  pageNumber?: number;
  limit?: number;
  
  constructor(
    private snackBar: MatSnackBar,
    public dialog: MatDialog,
    private pcvaSettings: PcvaSettingsService
  ){}

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }

  ngOnInit(): void {
    this.loadICD10Codes();
  }

  loadICD10Codes(){
      this.loadingData = true
    this.icd10Data$ = this.pcvaSettings.getICD10Codes(
        {
          paging: true,
          page_number: this.pageNumber,
          limit: this.limit,
        },
        "false"
      ).pipe(
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

  onAddICD10(){
    const dialogRef = this.dialog.open(AddIcd10CodesComponent, {
      width: '800px',
      data: {},
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if(result){
        this.loadICD10Codes();
      }
    });
  }

  onPageChange(event: any) {
    this.pageNumber = event.pageIndex > 0 ? event.pageIndex + 1 : event.pageIndex;
    this.limit = Number(event?.pageSize);
    this.loadICD10Codes();
  }
}
