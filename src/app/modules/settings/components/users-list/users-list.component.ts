import { Component, OnInit } from '@angular/core';
import { UsersService } from '../../services/users.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { catchError, map, Observable } from 'rxjs';
import { AssignRolesFormComponent } from '../../dialogs/assign-roles-form/assign-roles-form.component';
import { UserFormComponent } from '../../dialogs/user-form/user-form.component';
import { ViewUserComponent } from '../../dialogs/view-user/view-user.component';
import { SharedConfirmationComponent } from 'app/shared/dialogs/shared-confirmation/shared-confirmation.component';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    private snackBar: MatSnackBar
  ){}

  ngOnInit(): void {
    this.loadUsers()
  }

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
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

  onViewUser(user: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "40vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      user: user
    }
    this.dialog.open(ViewUserComponent, dialogConfig)
  }
  
  onAddUser(){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "60vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    this.dialog.open(UserFormComponent, dialogConfig).afterClosed().subscribe({
      next: (response) => {
        if(response) this.loadUsers();
      }})
  }
  
  onEditUser(user: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "60vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      user: user
    }
    this.dialog.open(UserFormComponent, dialogConfig).afterClosed().subscribe({
      next: (response) => {
        if(response) this.loadUsers();
      }})
  }
  
  onDeactivateUser(user: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "60vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      modalMessage : `Are you sure you want to ${user?.is_active ? 'deactivate' : 'activate'} ${user?.name}`,
      cancelButtonText : "Cancel",
      confirmationButtonColor : `${user?.is_active ? 'red' : 'green'}`,
      confirmationButtonText : `${user?.is_active ? 'deactivate' : 'activate'}`,
    }
    this.dialog.open(SharedConfirmationComponent, dialogConfig).afterClosed().subscribe({
      next: (response) => {
        user.is_active = !user?.is_active;
        if(response) this.usersService.updateUser(user).subscribe({
          next: () => {
            this.notificationMessage("User deactivated successfully!")
            this.loadUsers();
          }
        });
      }})
  }

  onPageChange(event: any) {
    this.pageNumber = event.pageIndex > 0 ? event.pageIndex + 1 : event.pageIndex;
    this.limit = Number(event?.pageSize);
    this.loadUsers();
  }
}
