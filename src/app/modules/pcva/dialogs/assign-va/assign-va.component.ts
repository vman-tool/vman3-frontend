import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { VaRecordsService } from '../../services/va-records/va-records.service';
import { lastValueFrom, map, Observable } from 'rxjs';
import { flatten, keyBy }  from 'lodash';
import {
  MatColumnDef,
  MatHeaderRowDef,
  MatNoDataRow,
  MatRowDef,
  MatTable,
  MatTableDataSource,
} from '@angular/material/table';
import { Sort } from '@angular/material/sort';

@Component({
  selector: 'app-assign-va',
  templateUrl: './assign-va.component.html',
  styleUrl: './assign-va.component.scss'
})
export class AssignVaComponent implements OnInit, AfterViewInit {
  vaRecords$?: Observable<any>
  pageNumber?: number = 0;
  pageSizeOptions = [10, 20, 50, 100]
  limit?: number;
  paging?: boolean;
  include_assignments?: boolean = true;
  coder: any;
  headers: any;
  loadingData: boolean = false;
  selectedVAs: string[] = []
  assignments: any = {};
  responsestore: any;
  lastHeader?: string;
  reloadOnClose: boolean = false;
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private matDialogRef: MatDialogRef<AssignVaComponent>,
    private vaRecordsService: VaRecordsService
  ) {
    this.coder = data?.coder
  }

  ngOnInit(): void {
    this.loadVARecords();
  }

  async loadVARecords(){
    this.loadingData = true
    this.vaRecords$ = this.vaRecordsService.getUnassignedVARecords({paging: this.paging, page_number: this.pageNumber, limit: this.limit},this.coder?.uuid).pipe(
      map((response: any) => {
        console.log(response)
        if(!this.headers){
          this.headers = Object.keys(response?.data[0])
          this.lastHeader = this.headers[this.headers.length - 1]
          this.headers = this.headers?.filter((header: string) => header !== this.lastHeader)
        }

        let tempAssignments: any = [];

        let responseWithoutAssignments = response?.data?.map((va: any) => {
          tempAssignments = [
            ...tempAssignments,
            ...va[this.lastHeader!]
          ] 
          return va
        })

        this.responsestore = response;

        
        this.assignments = keyBy(flatten(tempAssignments?.map((assignment: any) => {
          return {
            vaId: assignment?.vaId,
            coder: assignment?.coder?.uuid
          }
        })), 'vaId')
        this.loadingData = false

        return {
          ...response,
          data: responseWithoutAssignments
        }
      })
    )
    
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
      (dialogElement as HTMLElement).style.borderRadius = '5px';
    }
  }

  announceSortChange(sortState: any){
    console.log(sortState)
  }

  onSelectVA(e: Event, selectedVA: string | any[]){
    if(e.target instanceof HTMLInputElement && e.target.checked){
      if(typeof selectedVA === 'object'){
        this.selectedVAs = selectedVA?.map((selected: any) => selected?.instanceid)
      }
      if(typeof selectedVA === 'string'){
        this.selectedVAs = [
          ...this.selectedVAs,
          selectedVA
        ]
      }
    } else {
      if(typeof selectedVA === 'object'){
        this.selectedVAs = []
      }
      if(typeof selectedVA === 'string'){
        this.selectedVAs = this.selectedVAs.filter(va => va!== selectedVA)
      }
    }
  }

  onAssignVA(e: Event){
    const data = {
      vaIds: this.selectedVAs,
      coder: this.coder?.uuid
    }
    this.vaRecordsService.assignVARecords(data).subscribe({
      next: (response: any) => {
        this.reloadOnClose = true;
        this.loadVARecords()
        this.selectedVAs = [];
      },
      error: (error: any) => {
        console.error(error)
      }
    })
  }

  onPageChange(event: any) {
    this.pageNumber = this.pageNumber == 0 && this.pageNumber < event.pageIndex ? event.pageIndex + 1 : this.pageNumber !== 0 && this.pageNumber! > event.pageIndex ? event.pageIndex - 1 : event.pageIndex;
    this.pageNumber = this.pageNumber! < 0 ? 0 : this.pageNumber;
    this.limit = Number(event?.pageSize);
    this.loadVARecords();
  }

  onClose(){
    this.matDialogRef.close(this.reloadOnClose);
  }
}
