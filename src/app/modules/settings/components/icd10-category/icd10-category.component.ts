import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PcvaSettingsService } from '../../services/pcva-settings.service';
import { AddIcd10CategoryComponent } from '../../dialogs/add-icd10-category/add-icd10-category.component';
import { catchError, map, Observable } from 'rxjs';

@Component({
  selector: 'app-icd10-category',
  templateUrl: './icd10-category.component.html',
  styleUrl: './icd10-category.component.scss'
})
export class Icd10CategoryComponent {
  icd10CategoryData$?: Observable<any>;
      loadingData: boolean = false;
      pageNumber?: number;
      limit?: number;

      selectedICD10CategoryTypes: any[] = [];
      searchText?: string;
      categoryTypes: any[] = [];
      categoryTypesSelected: string[] = [];
      
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
        this.loadICD10CodeCategories();
        this.loadICD10CategoryTypes();
      }
    
      loadICD10CodeCategories(){
          this.loadingData = true
        this.icd10CategoryData$ = this.pcvaSettings.getICD10Categories(
            {
              paging: true,
              page_number: this.pageNumber,
              limit: this.limit,
            },
            this.searchText,
            this.categoryTypesSelected
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
        const dialogRef = this.dialog.open(AddIcd10CategoryComponent, {
          width: '800px',
          data: {},
        });
    
        dialogRef.afterClosed().subscribe((result: any) => {
          if(result){
            this.loadICD10CodeCategories();
          }
        });
      }

      loadICD10CategoryTypes(){
        this.pcvaSettings.getICD10CategoryTypes(
          {
            paging: false,
          }
        ).pipe(
          map((response: any) => {
            this.categoryTypes = response?.data?.map((categoryType: any) => {
              return {
                value: categoryType?.uuid,
                label: categoryType?.name 
              }
            });
            return this.categoryTypes; 
          }),
          catchError((error: any) => {
            return error;
          })
        ).subscribe();
      }

      applyFilters(){
        this.categoryTypesSelected = this.selectedICD10CategoryTypes.map(categoryType => categoryType.value);

        this.loadICD10CodeCategories();
      }

      onSelectDropdown(value: any){
        this.selectedICD10CategoryTypes = this.categoryTypes.filter(categoryType => value.includes(categoryType.value));
      }

      clearFilters(){
        this.searchText = undefined;
        this.selectedICD10CategoryTypes = []
        this.categoryTypesSelected = []
        this.loadICD10CodeCategories();
      }
    
      onPageChange(event: any) {
        this.pageNumber = this.pageNumber == 0 && this.pageNumber < event.pageIndex ? event.pageIndex + 1 : this.pageNumber !== 0 && this.pageNumber! > event.pageIndex ? event.pageIndex - 1 : event.pageIndex;
        this.pageNumber = this.pageNumber! < 0 ? 0 : this.pageNumber;
        this.limit = Number(event?.pageSize);
        this.loadICD10CodeCategories();
      }
}
