import { DialogRef } from '@angular/cdk/dialog';
import { AfterViewInit, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-shared-icd10-form',
  templateUrl: './shared-icd10-form.component.html',
  styleUrl: './shared-icd10-form.component.scss'
})
export class SharedIcd10FormComponent implements OnInit, AfterViewInit {

  title?: string;

  constructor(
    private dialogRef: DialogRef<SharedIcd10FormComponent>
  ) { }

  ngOnInit(): void {
    
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
      (dialogElement as HTMLElement).style.borderRadius = '5px';
    }
  }

  onClose(){
    this.dialogRef.close()
  }
}
