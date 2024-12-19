import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, Observable } from 'rxjs';
import { PcvaSettingsService } from '../../services/pcva-settings.service';

@Component({
  selector: 'app-icd-10-codes',
  templateUrl: './icd-10-codes.component.html',
  styleUrl: './icd-10-codes.component.scss'
})
export class Icd10CodesComponent {
  
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

  onPageChange(event: any) {
    this.pageNumber = event.pageIndex > 0 ? event.pageIndex + 1 : event.pageIndex;
    this.limit = Number(event?.pageSize);
    this.loadICD10Codes();
  }
}
