import { Component } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { SharedIcd10FormComponent } from '../../dialogs/shared-icd10-form/shared-icd10-form.component';

@Component({
  selector: 'app-icd10-codes',
  templateUrl: './icd10-codes.component.html',
  styleUrl: './icd10-codes.component.scss'
})
export class Icd10CodesComponent {
  constructor(private dialog: MatDialog){}

  onAddCode(){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "50vw";
    dialogConfig.height = "50vh";
    dialogConfig.panelClass = "cdk-overlay-pane"
    
    this.dialog.open(SharedIcd10FormComponent, {
      ...dialogConfig,
      data: {
        mode: 'add',
        title: 'Add ICD-10 Code'
      }
    });
  }
}
