import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { lastValueFrom } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss'
})
export class UserFormComponent implements OnInit, AfterViewInit {
  
  name?: string;
  password?: string;
  confirm_password?: string;
  email?: string;
  currentUser?: any;
  is_active: any;
  accessLimit?: any;
  selectedRoles?: any;


  constructor(
    public dialogRef: MatDialogRef<UserFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private usersService: UsersService,
    private snackBar: MatSnackBar
  ){}

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }

  ngOnInit(): void {
    this.name = this.data?.user?.name
    this.email = this.data?.user?.email
    this.is_active = this.data?.user ? this.data?.user?.is_active : true
    this.password = ""
    this.confirm_password = ""
    this.currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
    }
  }

  onSelected(data: any, key: string): void {
    if(key === 'roles'){
      this.selectedRoles = data
    }
    if(key === 'access_limit'){
      this.accessLimit = data
    }
  }


  saveUser() {
    if(!this.name){
      this.notificationMessage('Please enter a role name');
      return;
    }
    let user: any = {
      name: this.name,
      email: this.email,
      password: this.password,
      is_active: this.is_active,
      confirm_password: this.confirm_password,
    }

    if (this.data?.user?.uuid){
      user.uuid = this.data?.user?.uuid

      this.usersService.updateUser(user).subscribe(
        {
          next: () => {
            this.saveAccessData(this.data.user.uuid)
            this.notificationMessage('User saved successfully');
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error(error);
            this.notificationMessage(error?.error?.detail || 'Failed to save user');
          }
        }
      )
    } else {

      this.usersService.saveUser(user).subscribe(
        {
          next: (response: any) => {
            this.saveAccessData(response.uuid)
            this.notificationMessage('User saved successfully');
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error(error);
            this.notificationMessage(error?.error?.detail || 'Failed to save user');
          }
        }
      )
    }

  }
  
  
  saveAccessData(userUuid: string) {
    let roleAssignment: any = {
        user: userUuid,
        roles: this.selectedRoles?.map((role: any) => role?.uuid)
      }

      roleAssignment.access_limit = this.accessLimit
  
      this.usersService.saveAssignment(roleAssignment ).subscribe(
        {
          next: () => {
            this.notificationMessage('Assignment saved successfully');
          },
          error: (error) => {
            console.error(error);
            this.notificationMessage(error?.message || error?.error?.detail || 'Failed to assign/unassign role');
          }
        }
      )
  }

  onClose(){
    this.dialogRef.close()
  }
}
