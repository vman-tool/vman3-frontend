import { Component, OnInit } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { RoleFormComponent } from '../../dialogs/role-form/role-form.component';
import { ViewRoleComponent } from '../../dialogs/view-role/view-role.component';
import { SharedConfirmationComponent } from 'app/shared/dialogs/shared-confirmation/shared-confirmation.component';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    private usersService: UsersService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ){}

  ngOnInit() {
    this.loadRoles()
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
