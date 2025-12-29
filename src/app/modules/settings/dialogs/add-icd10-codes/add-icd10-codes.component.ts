import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PcvaSettingsService } from '../../services/pcva-settings.service';
import { CsvExportService } from 'app/shared/services/csv-export.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-add-icd10-codes',
  templateUrl: './add-icd10-codes.component.html',
  styleUrl: './add-icd10-codes.component.scss'
})
export class AddIcd10CodesComponent implements OnInit, AfterViewInit {

  code?: string;
  name?: string;
  category?: string;
  file?: any;

  categories?: any;

  loading: boolean = false;
  selectedCategories: any[] = [];


  constructor(
    public dialogRef: MatDialogRef<AddIcd10CodesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackbar: MatSnackBar,
    private pcvaSettingsService: PcvaSettingsService,
    private csvExportService: CsvExportService
  ){}

  notificationMessage(message: string, duration?: number): void {
    this.snackbar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: duration ? duration : 3 * 1000,
    });
  }


  ngOnInit(): void {
    this.getCategories();
  }

  getCategories(){
    this.loading = true;
    this.pcvaSettingsService.getICD10Categories({
      paging: false,
    }).subscribe({
      next: (res: any) => {
        this.categories = res?.data?.map((category: any) => {
          return {
            value: category?.uuid,
            label: category?.name 
          }
        });
        this.loading = false;
      },
      error: (err) => {
        this.notificationMessage('Error fetching categories');
      }
    })
  }

  createCategory(addedCategory: string){
    this.pcvaSettingsService.createICD10Category({name: addedCategory}).subscribe({
      next: (res: any) => {
        this.notificationMessage('Category created successfully');
        this.selectedCategories = res?.data?.filter((category: any) => category?.name === addedCategory)?.map((category: any) => {
          return {
            value: category?.uuid,
            label: category?.name
          }
        });
        this.getCategories();
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

  async onDownloadSampleFile(){
    const categoryTypes: any = await lastValueFrom(this.pcvaSettingsService.getICD10CategoryTypes({
      paging: false,
    }));

    const categoryTypesCount = categoryTypes?.data?.length;
    const categoriesCount = this.categories?.length;
    const sampleCsvData = []

    if(categoriesCount && categoryTypesCount){
      this.notificationMessage(`Columns with UUIDs are actual data to guide you. Use the uuids in the category and type columns to map your data correctly.`, 7000);
      if(categoriesCount >= categoryTypesCount){
        for(let i = 0; i < categoriesCount; i++){
          const type = i <= categoryTypesCount ? categoryTypes?.data[i]?.uuid : categoryTypes?.data[Math.floor(Math.random() * categoryTypesCount)]?.uuid;
          const type_name = i <= categoryTypesCount ? categoryTypes?.data[i]?.name : categoryTypes?.data[Math.floor(Math.random() * categoryTypesCount)]?.name;
          sampleCsvData.push({
            code: `Code ${i + 1}`,
            name: `Name ${i + 1}`,
            category: this.categories[i]?.value,
            category_name: this.categories[i]?.label,
            type: type && type != "NaN" ? type : "",
            type_name: type_name,
          })
        }
      } else {
        for(let i = 0; i < categoryTypesCount; i++){
          const category = i <= categoriesCount ? this.categories[i]?.value : this.categories[Math.floor(Math.random() * categoriesCount)]?.value;
          const category_name = i <= categoriesCount ? this.categories[i]?.label : this.categories[Math.floor(Math.random() * categoriesCount)]?.label;
          
          sampleCsvData.push({
            code: `Code ${i + 1}`,
            name: `Name ${i + 1}`,
            category: category && category != "NaN" ? category : "",
            category_name: category_name,
            type: categoryTypes?.data[i]?.uuid,
            type_name: categoryTypes?.data[i]?.name,
          })
        }
      }
    } else {
      sampleCsvData.push({
        code: `Code`,
        name: `Name `,
        category: "Sample Category Name",
        type: "Sample Type Name",
      })

      this.notificationMessage(`There are no Major/Broad groups available. Please create them first to have a better sample CSV file./ Or add their names in this File and they'll be created automatically during upload (Not Recommended).`, 7000);
    }

    if(sampleCsvData.length){
      this.csvExportService.exportToCSV(sampleCsvData, 'sample-icd10-codes.csv');
    }
  }

  onFileSelected(e: any){
    e?.preventDefault();

    const fileInput = e?.target as HTMLInputElement;
    if (fileInput?.files?.length) {
      const file = fileInput.files[0];
      this.file = file
    }
  }

  onSelectCategory(category: string){
    this.category = category;
  }

  onClearFIle(){
    this.file = undefined;
  }

  onSave(e: any){
    if(!(this.name && this.code && this.category) && !this.file){
      this.notificationMessage('Please fill in all required fields');
      return;
    }

    if(this.file){
      const formData = new FormData();
      formData.append('file', this.file);

      this.pcvaSettingsService.bulkUploadICD10Codes(this.file).subscribe({
        next: (res: any) => {
          this.notificationMessage('ICD10 codes uploaded successfully');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.notificationMessage('Error uploading ICD10 codes');
        }
      })

      return;
    }

    const code = {
      code: this.code,
      name: this.name,
      category: this.category
    }

    this.pcvaSettingsService.createICD10Code([code]).subscribe({
      next: (res: any) => {
        this.notificationMessage('ICD10 code created successfully');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.notificationMessage('Error creating ICD10 code');
      }
    })
    
  }

  onClose() {
    this.dialogRef.close()
  }
}
