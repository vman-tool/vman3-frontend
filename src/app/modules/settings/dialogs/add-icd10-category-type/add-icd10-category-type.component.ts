import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PcvaSettingsService } from '../../services/pcva-settings.service';

@Component({
  selector: 'app-add-icd10-category-type',
  templateUrl: './add-icd10-category-type.component.html',
  styleUrl: './add-icd10-category-type.component.scss'
})
export class AddIcd10CategoryTypeComponent {
    name?: string;
    description?: string;
  
    constructor(
      public dialogRef: MatDialogRef<AddIcd10CategoryTypeComponent>,
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

    ngAfterViewInit() {
      const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
      if (dialogElement) {
        (dialogElement as HTMLElement).style.maxWidth = '100vw';
        (dialogElement as HTMLElement).style.minWidth = '0';
      }
    }
  
  
    onSave(e: any){
      if(!this.name){
        this.notificationMessage('Please fill in the name field');
        return;
      }

  
      const categoryType = {
        name: this.name,
        description: this.description,
      }
  
      this.pcvaSettingsService.createICD10CategoryType([categoryType]).subscribe({
        next: (res: any) => {
          this.notificationMessage('Broad Group created successfully');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.notificationMessage('Error creating Broad Group');
        }
      })
      
    }
  
    onClose() {
      this.dialogRef.close()
    }
}
