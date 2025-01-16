import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { VaRecordsService } from '../../services/va-records/va-records.service';
import { map, Observable } from 'rxjs';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { filter_keys_without_data } from 'app/shared/helpers/odk_data.helpers';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GenericIndexedDbService } from 'app/shared/services/indexedDB/generic-indexed-db.service';
import { OBJECTSTORE_VA_QUESTIONS } from 'app/shared/constants/indexedDB.constants';

@Component({
  selector: 'app-code-va',
  templateUrl: './code-va.component.html',
  styleUrls: ['./code-va.component.scss']
})
export class CodeVaComponent implements OnInit, AfterViewInit{
  vaRecord$?: Observable<any>;
  odkQuestions: any;
  questionsIds?: string[];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private matDialogRef: MatDialogRef<CodeVaComponent>,
    private vaRecordsService: VaRecordsService,
    private indexedDBService: IndexedDBService,
    private genericIndexedDbService: GenericIndexedDbService,
    private snackBar: MatSnackBar
  ) { }
   
  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }

  ngOnInit(): void {
    this.getVaRecord();
    this.getQuestions();
  }

  getVaRecord(): any {
    this.vaRecord$ = this.vaRecordsService.getVARecords(undefined, undefined, undefined, undefined, false, this.data?.va).pipe(
      map((response: any) => {
          response['data'] = filter_keys_without_data(response.data)
          return response
        })
      )
  }

  async getQuestions(): Promise<any> {
    // this.odkQuestions = await this.indexedDBService.getQuestions()
    this.odkQuestions = await this.genericIndexedDbService.getData(OBJECTSTORE_VA_QUESTIONS)
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
    }
  }

  onSave(coded_va: any): void {
  //  console.log(coded_va);
    this.vaRecordsService.codeAssignedVA(coded_va).subscribe({
      next: (response: any) => {
        this.notificationMessage('VA coded successfully!');
        this.matDialogRef.close();
      },
      error: (error: any) => {
        this.notificationMessage('Failed to submit VA code!');
        console.error(error);
      }
    })
  }
}
