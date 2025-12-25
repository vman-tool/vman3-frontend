import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PcvaSettingsService } from '../../services/pcva-settings.service';
import { AddIcd10CategoryComponent as AddIcd10CategoryTypeComponent } from '../../dialogs/add-icd10-category/add-icd10-category.component';
import { catchError, map, Observable } from 'rxjs';

@Component({
  selector: 'app-icd10-category-type',
  templateUrl: './icd10-category-type.component.html',
  styleUrl: './icd10-category-type.component.scss'
})
export class Icd10CategoryTypeComponent {
    icd10CategoryTypesData$?: Observable<any>;
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
      this.loadICD10CodeCategoryTypes();
    }
  
    loadICD10CodeCategoryTypes(){
        this.loadingData = true
      this.icd10CategoryTypesData$ = this.pcvaSettings.getICD10CategoryTypes(
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
  
    onAddICD10Category(){
      const dialogRef = this.dialog.open(AddIcd10CategoryTypeComponent, {
        width: '800px',
        data: {},
      });
  
      dialogRef.afterClosed().subscribe((result: any) => {
        if(result){
          this.loadICD10CodeCategoryTypes();
        }
      });
    }
  
    onPageChange(event: any) {
      this.pageNumber = this.pageNumber == 0 && this.pageNumber < event.pageIndex ? event.pageIndex + 1 : this.pageNumber !== 0 && this.pageNumber! > event.pageIndex ? event.pageIndex - 1 : event.pageIndex;
      this.pageNumber = this.pageNumber! < 0 ? 0 : this.pageNumber;
      this.limit = Number(event?.pageSize);
      this.loadICD10CodeCategoryTypes();
    }
}
