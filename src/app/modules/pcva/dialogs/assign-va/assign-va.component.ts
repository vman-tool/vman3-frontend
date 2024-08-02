import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { VaRecordsService } from '../../services/va-records/va-records.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-assign-va',
  templateUrl: './assign-va.component.html',
  styleUrl: './assign-va.component.scss'
})
export class AssignVaComponent implements OnInit {
  vaRecords$?: Observable<any>
  page_number?: number;
  limit?: number;
  paging?: boolean;
  include_assignments?: boolean;
  coder: any;
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private matDialogRef: MatDialogRef<AssignVaComponent>,
    private vaRecordsService: VaRecordsService
  ) {
    this.coder = data?.coder
  }

  ngOnInit(): void {
    this.vaRecords$ = this.vaRecordsService.getVARecords(this.paging, this.page_number, this.limit, this.include_assignments)
  }
}
