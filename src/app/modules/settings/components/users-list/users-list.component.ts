import { Component, OnInit } from '@angular/core';
import { UsersService } from '../../services/users.service';
import { MatDialog } from '@angular/material/dialog';
import { catchError, map, Observable } from 'rxjs';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss'
})
export class UsersListComponent implements OnInit {
  usersData$?: Observable<any>;
  loadingData: boolean = false;
  
  constructor(
    private codersService: UsersService,
    public dialog: MatDialog,
  ){}

  ngOnInit(): void {
    this.loadingData = true
    this.usersData$ = this.codersService.getUsers(true).pipe(
      map((response) => {
        this.loadingData = false
       return response;
      }),
      catchError((error: any) => {
        this.loadingData = false
        return error;
      })
    );
  }
}
