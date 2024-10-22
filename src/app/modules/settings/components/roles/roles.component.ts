import { Component, OnInit } from '@angular/core';
import { catchError, lastValueFrom, map, Observable } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { RoleFormComponent } from '../../dialogs/role-form/role-form.component';
import { ViewRoleComponent } from '../../dialogs/view-role/view-role.component';
import { SharedConfirmationComponent } from 'app/shared/dialogs/shared-confirmation/shared-confirmation.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'app/core/services/authentication/auth.service';
import * as privileges  from 'app/shared/constants/privileges.constants';

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
  canAddRoles: boolean = false;
  canUpdateRoles: boolean = false;
  canDeleteRoles: boolean = false;
  current_user?: any;

  constructor(
    private usersService: UsersService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ){}

  ngOnInit() {
    this.current_user = JSON.parse(localStorage.getItem("current_user") || "{}");
    this.loadRoles()
    this.runPrivilegesCheck()
  }

  async runPrivilegesCheck() {
    this.canAddRoles = await lastValueFrom(this.authService.hasPrivilege([privileges.USERS_CREATE_ROLES, privileges.USERS_VIEW_PRIVILEGES]))
    this.canUpdateRoles = await lastValueFrom(this.authService.hasPrivilege([privileges.USERS_UPDATE_ROLES, privileges.USERS_VIEW_PRIVILEGES]))
    this.canDeleteRoles = await lastValueFrom(this.authService.hasPrivilege([privileges.USERS_DELETE_ROLES]))
  }

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
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

  onAddRole(){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "60vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    this.dialog.open(RoleFormComponent, dialogConfig).afterClosed().subscribe({
      next: (response) => {
        if(response) this.loadRoles();
      }})
  }
  onEditRole(role: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "60vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      role: role
    }
    this.dialog.open(RoleFormComponent, dialogConfig).afterClosed().subscribe({
      next: (response) => {
        if(response) this.loadRoles();
      }})
  }
  
  onViewRole(role: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "50vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      role: role
    }
    this.dialog.open(ViewRoleComponent, dialogConfig)
  }

  onDeleteRole(role: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "50vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      modalMessage: 'Are you sure you want to delete this role?',
      cancelButtonText: 'cancel',
      confirmationButtonText: 'Delete',
      confirmationButtonColor: 'red',
    }
    this.dialog.open(SharedConfirmationComponent, dialogConfig).afterClosed().subscribe(
      (confirmed) => {
        if(confirmed) this.usersService.deleteRole(role)?.subscribe({
          next: () => {
            this.notificationMessage("Role deleted successfully!")
            this.loadRoles();
          },
          error: () => this.notificationMessage("Failed to delete role!")
        } 
        )
      })
  }

  onPageChange(event: any) {
    this.pageNumber = event.pageIndex > 0 ? event.pageIndex + 1 : event.pageIndex;
    this.limit = Number(event?.pageSize);
    this.loadRoles();
  }
}
