import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PcvaSettingsService } from '../../services/pcva-settings.service';

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
  ){}

  notificationMessage(message: string): void {
    this.snackbar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
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
