import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'app/core/services/authentication/auth.service';
import { lastValueFrom } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-role-form',
  templateUrl: './role-form.component.html',
  styleUrl: './role-form.component.scss'
})
export class RoleFormComponent implements OnInit, AfterViewInit {
  
  roleName?: string;
  availablePrivileges: string[] = [];
  selectedPrivileges: string[] = [];
  searchTermAvailable: string = '';
  searchSelectedTerm: string = '';
  allPrivileges: string[] = [];
  roleUuid?: string;


  constructor(
    public dialogRef: MatDialogRef<RoleFormComponent>,
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
    this.getAllPrivileges();
  }

  async getAllPrivileges() {
    const privilegesResponse: any = await lastValueFrom(this.usersService.getPrivileges())
    this.allPrivileges = privilegesResponse?.data
    this.roleUuid = this.data?.role?.uuid || '';
    this.roleName = this.data?.role?.name || '';
    this.selectedPrivileges = this.data?.role?.privileges || [];
    this.availablePrivileges = this.allPrivileges.filter((privilege: string) => !this.selectedPrivileges.includes(privilege));
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
    }
  }

  filteredPrivileges() {
    return this.availablePrivileges.filter(item =>
      item.toLowerCase().includes(this.searchTermAvailable.toLowerCase())
    );
  }
  
  filteredSelectedPrivileges() {
    return this.selectedPrivileges.filter(item =>
      item.toLowerCase().includes(this.searchSelectedTerm.toLowerCase())
    );
  }

  moveToSelected(privilege: string) {
    this.selectedPrivileges = [
      ...this.selectedPrivileges,
      privilege
    ];
    this.availablePrivileges = this.availablePrivileges.filter(item => item !== privilege);
  }

  moveToAvailable(item: string) {
    this.availablePrivileges = [
      ...this.availablePrivileges,
      item
    ]
    this.selectedPrivileges = this.selectedPrivileges.filter(priv => priv!== item);
  }

  saveRole() {
    if(!this.roleName){
      this.notificationMessage('Please enter a role name');
      return;
    }
    let role: any = {
      name: this.roleName,
      privileges: this.selectedPrivileges
    }
    if(this.roleUuid){
      role.uuid = this.roleUuid
    }

    this.usersService.saveRole(role).subscribe(
      {
        next: () => {
          this.notificationMessage('Role saved successfully');
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error(error);
          this.notificationMessage('Failed to save role');
        }
      }
    )
  }

  onClose(){
    this.dialogRef.close()
  }
}
