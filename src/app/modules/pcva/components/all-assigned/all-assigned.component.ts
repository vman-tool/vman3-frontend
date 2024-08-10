import { Component, OnInit } from '@angular/core';
import { AllAssignedService } from '../../services/all-assigned/all-assigned.service';
import { catchError, map, Observable } from 'rxjs';

@Component({
  selector: 'app-all-assigned',
  templateUrl: './all-assigned.component.html',
  styleUrl: './all-assigned.component.scss'
})
export class AllAssignedComponent implements OnInit {
  assignedVas$?: Observable<any>
  loadingData: boolean = false;


  constructor(private allAssignedService: AllAssignedService){}

  ngOnInit(): void {
    this.loadingData = true
    const current_user = JSON.parse(localStorage.getItem('current_user') || '{}');
    this.assignedVas$ = this.allAssignedService.getAssignedVARecords(
      {
        paging: true,
        page_number: 1,
        limit: 10,
      },
      "false",
      undefined,
      current_user?.uuid
    ).pipe(
      map((response) => {
        this.loadingData = false
       return response;
      }),
      catchError((error: any) => {
        this.loadingData = false
        return error;
      })
    )
  }

}
