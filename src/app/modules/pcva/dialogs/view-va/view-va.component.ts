import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { VaRecordsService } from '../../services/va-records/va-records.service';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-view-va',
  templateUrl: './view-va.component.html',
  styleUrl: './view-va.component.scss'
})
export class ViewVaComponent implements OnInit, AfterViewInit{
  vaRecord$?: Observable<any>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private vaRecordsService: VaRecordsService
  ) { }
   
  ngOnInit(): void {
    this.getVaRecord();
  }

  getVaRecord(): any {
    this.vaRecord$ = this.vaRecordsService.getVARecords(undefined, undefined, undefined, undefined, false, this.data?.va?.vaId).pipe(
      map((response: any) => { 
          return response
        })
      )
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
      (dialogElement as HTMLElement).style.borderRadius = '10px';
      (dialogElement as HTMLElement).classList.add('rounded-full');
    }
  }
}
