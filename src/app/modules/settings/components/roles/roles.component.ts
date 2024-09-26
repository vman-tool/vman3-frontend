import { Component, OnInit } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss'
})
export class RolesComponent implements OnInit {
  loadingData: boolean = false;
  rolesData$?: Observable<any>;
  pageNumber?: number;
  limit?: number;

  constructor(
    private usersService: UsersService
  ){}

  ngOnInit() {
    this.loadRoles()
  }



  loadRoles(){
     this.loadingData = true
    this.rolesData$ = this.usersService.getRoles(
      {
        paging: true,
        page_number: this.pageNumber,
        limit: this.limit,
      },
      "false"
    ).pipe(
      map((response: any) => {
        this.loadingData = false
       return response;
      }),
      catchError((error: any) => {
        this.loadingData = false
        return error;
      })
    );
  }
  onPageChange(event: any) {
    this.pageNumber = event.pageIndex > 0 ? event.pageIndex + 1 : event.pageIndex;
    this.limit = Number(event?.pageSize);
    this.loadRoles();
  }
}
