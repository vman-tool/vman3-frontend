import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-add-icd10-codes',
  templateUrl: './add-icd10-codes.component.html',
  styleUrl: './add-icd10-codes.component.scss'
})
export class AddIcd10CodesComponent implements OnInit, AfterViewInit {

  code?: string;
  name?: string;
  category?: string;

  constructor(
    public dialogRef: MatDialogRef<AddIcd10CodesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackbar: MatSnackBar,
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

  onSave(e: any){}

  onClose() {
    this.dialogRef.close()
  }
}
