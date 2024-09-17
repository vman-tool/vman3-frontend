import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SharedIcd10FormComponent } from '../../dialogs/shared-icd10-form/shared-icd10-form.component';

@Component({
  selector: 'app-icd10-codes',
  templateUrl: './icd10-codes.component.html',
  styleUrl: './icd10-codes.component.scss'
})
export class Icd10CodesComponent {
  constructor(private dialog: MatDialog){}

  onAddCode(){
    this.dialog.open(SharedIcd10FormComponent, {
      width: '100%',
      data: {
        mode: 'add',
        title: 'Add ICD-10 Code'
      }
    });
  }
}
