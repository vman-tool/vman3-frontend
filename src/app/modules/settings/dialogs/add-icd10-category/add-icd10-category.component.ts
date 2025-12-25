import { Component, Inject } from '@angular/core';
import { PcvaSettingsService } from '../../services/pcva-settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { add } from 'lodash';
import { CsvExportService } from 'app/shared/services/csv-export.service';

@Component({
  selector: 'app-add-icd10-category',
  templateUrl: './add-icd10-category.component.html',
  styleUrl: './add-icd10-category.component.scss'
})
export class AddIcd10CategoryComponent {
    name?: string;
    description?: string;
    file?: any;
    categoryType?: string;
  
    categoryTypes?: any;
  
    loading: boolean = false;
    selectedCategoryTypes: any[] = [];
  
  
    constructor(
      public dialogRef: MatDialogRef<AddIcd10CategoryComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any,
      private snackbar: MatSnackBar,
      private pcvaSettingsService: PcvaSettingsService,
      private csvExportService: CsvExportService
    ){}
  
    notificationMessage(message: string): void {
      this.snackbar.open(`${message}`, 'close', {
        horizontalPosition: 'end',
        verticalPosition: 'top',
        duration: 3 * 1000,
      });
    }
  
  
    ngOnInit(): void {
      this.getCategoryTypes();
    }
  
    getCategoryTypes(){
      this.loading = true;
      this.pcvaSettingsService.getICD10CategoryTypes({
        paging: false,
      }).subscribe({
        next: (res: any) => {
          this.categoryTypes = res?.data?.map((category: any) => {
            return {
              value: category?.uuid,
              label: category?.name 
            }
          });
          this.loading = false;
        },
        error: (err) => {
          this.notificationMessage('Error fetching Broad Groups');
        }
      })
    }
  
    createCategory(){
      const categoryObject = {
        name: this.name,
        description: this.description,
        type: this.selectedCategoryTypes[0]?.value
      }
      this.pcvaSettingsService.createICD10Category(categoryObject).subscribe({
        next: (res: any) => {
          this.notificationMessage('Category created successfully');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.notificationMessage('Error creating category');
        }
      })
    }

    ngAfterViewInit() {
      const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
      if (dialogElement) {
        (dialogElement as HTMLElement).style.maxWidth = '100vw';
        (dialogElement as HTMLElement).style.minWidth = '0';
      }
    }

    downloadSampleCSV(){
      const sampleData = [];
      for(let i = 0; i < this.categoryTypes?.length; i++){
        sampleData.push({
          name: `Sample Major group ${i + 1}`,
          description: `This is a description for Sample Major group ${i + 1}`,
          type: this.categoryTypes[i]?.value,
          type_name: this.categoryTypes[i]?.label,
        });
      }
      
      this.csvExportService.exportToCSV(sampleData, 'sample-icd10-major-groups.csv');
    }
  
    onFileSelected(e: any){
      e?.preventDefault();
  
      const fileInput = e?.target as HTMLInputElement;
      if (fileInput?.files?.length) {
        const file = fileInput.files[0];
        this.file = file
      }
    }
  
    onSelectCategoryType(categoryType: string){
      this.categoryType = categoryType;
    }
  
    onClearFIle(){
      this.file = undefined;
    }
  
    onSave(e: any){
      if(!(this.name && this.categoryType) && !this.file){
        this.notificationMessage('Please fill in all required fields');
        return;
      }
  
      if(this.file){
        const formData = new FormData();
        formData.append('file', this.file);
  
        this.pcvaSettingsService.bulkUploadICD10Codes(this.file).subscribe({
          next: (res: any) => {
            this.notificationMessage('Major Groups uploaded successfully');
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.notificationMessage('Error uploading Major Groups');
          }
        })
  
        return;
      }
  
      const category = {
        description: this.description,
        name: this.name,
        type: this.categoryType
      }
  
      this.pcvaSettingsService.createICD10Category([category]).subscribe({
        next: (res: any) => {
          this.notificationMessage('Major Group created successfully');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.notificationMessage('Error creating Major Group');
        }
      })
      
    }
  
    onClose() {
      this.dialogRef.close()
    }
}
