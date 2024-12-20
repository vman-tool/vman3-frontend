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

  addedCategory?: string;


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
    
  }

  getCategories(){
    this.pcvaSettingsService.getICD10Categories().subscribe({
      next: (res: any) => {
        this.categories = res?.data;
      },
      error: (err) => {
        this.notificationMessage('Error fetching categories');
      }
    })
  }

  createCategory(category: string){
    this.addedCategory = category;
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
          this.dialogRef.close();
        },
        error: (err) => {
          this.notificationMessage('Error uploading ICD10 codes');
        }
      })
      
    }
    
  }

  onClose() {
    this.dialogRef.close()
  }
}
