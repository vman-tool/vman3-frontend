import { Component, OnInit } from '@angular/core';
import { UsersService } from '../../services/users.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { catchError, map, Observable } from 'rxjs';
import { AssignRolesFormComponent } from '../../dialogs/assign-roles-form/assign-roles-form.component';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss'
})
export class UsersListComponent implements OnInit {
  usersData$?: Observable<any>;
  loadingData: boolean = false;
  pageNumber?: number;
  limit?: number;
  
  constructor(
    private usersService: UsersService,
    public dialog: MatDialog,
  ){}

  ngOnInit(): void {
    this.loadUsers()
  }

  loadUsers(){
    this.loadingData = true
    this.usersData$ = this.usersService.getUsers(
      {
        paging: true,
        page_number: this.pageNumber,
        limit: this.limit,
      },
      "false"
    ).pipe(
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

  onAssignRoles(user: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "60vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      user: user
    }
    this.dialog.open(AssignRolesFormComponent, dialogConfig).afterClosed().subscribe({
      next: (response) => {
        // if(response) this.loadUsers();
      }})
  }

  onPageChange(event: any) {
    this.pageNumber = event.pageIndex > 0 ? event.pageIndex + 1 : event.pageIndex;
    this.limit = Number(event?.pageSize);
    this.loadUsers();
  }
}
