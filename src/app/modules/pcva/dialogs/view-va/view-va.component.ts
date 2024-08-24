import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { VaRecordsService } from '../../services/va-records/va-records.service';
import { map, Observable } from 'rxjs';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { filter_keys_without_data } from 'app/shared/helpers/odk_data.helpers';

@Component({
  selector: 'app-view-va',
  templateUrl: './view-va.component.html',
  styleUrl: './view-va.component.scss'
})
export class ViewVaComponent implements OnInit, AfterViewInit{
  vaRecord$?: Observable<any>;
  odkQuestions: any;
  questionsIds?: string[];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private vaRecordsService: VaRecordsService,
    private indexedDBService: IndexedDBService
  ) { }
   
  ngOnInit(): void {
    this.getVaRecord();
    this.getQuestions();
  }

  getVaRecord(): any {
    this.vaRecord$ = this.vaRecordsService.getVARecords(undefined, undefined, undefined, undefined, false, this.data?.va?.vaId).pipe(
      map((response: any) => {
          response['data'] = filter_keys_without_data(response.data)
          return response
        })
      )
  }

  async getQuestions(): Promise<any> {
    this.odkQuestions = await this.indexedDBService.getQuestions()
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
