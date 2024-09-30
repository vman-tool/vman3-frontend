import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { lastValueFrom } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-assign-roles-form',
  templateUrl: './assign-roles-form.component.html',
  styleUrl: './assign-roles-form.component.scss'
})
export class AssignRolesFormComponent implements OnInit, AfterViewInit {
  
  availableRoles: any[] = [];
  selectedRoles: any[] = [];
  searchTermAvailable: string = '';
  searchSelectedTerm: string = '';
  allRoles: any[] = [];
  userUuid: string = '';


  constructor(
    public dialogRef: MatDialogRef<AssignRolesFormComponent>,
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
    this.getAllRoles();
  }

  async getAllRoles() {
    const rolesResponse: any = await lastValueFrom(this.usersService.getRoles({paging: false}))
    this.userUuid = this.data?.user?.uuid || '';
    const user_roles: any = await lastValueFrom(this.usersService.getUserRoles(this.userUuid))
    this.allRoles = rolesResponse?.data
    this.selectedRoles = user_roles?.data?.roles || [];
    this.availableRoles = this.allRoles.filter((role: any) => !this.selectedRoles.some(selectedRole => selectedRole?.uuid === role?.uuid));
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
      (dialogElement as HTMLElement).style.borderRadius = '10px';
      (dialogElement as HTMLElement).classList.add('rounded-full');
    }
  }

  filteredRoles() {
    return this.availableRoles.filter(role =>
      role?.name?.toLowerCase().includes(this.searchTermAvailable.toLowerCase())
    );
  }
  
  filteredSelectedRoles() {
    return this.selectedRoles.filter(role =>
      role?.name?.toLowerCase().includes(this.searchTermAvailable.toLowerCase())
    );
  }

  moveToSelected(selectedRole: any) {
    this.selectedRoles = [
      ...this.selectedRoles,
      selectedRole
    ].sort((roleA, roleB) => {
        if (roleA.name < roleB.name) {
          return -1;
        } else {
          return 1;
        }
      });
    this.availableRoles = this.availableRoles.filter(role => role?.uuid !== selectedRole?.uuid);
  }

  moveToAvailable(deselectedRole: any) {
    this.availableRoles = [
      ...this.availableRoles,
      deselectedRole
    ].sort((roleA, roleB) => {
        if (roleA.name < roleB.name) {
          return -1;
        } else {
          return 1;
        }
      })
    this.selectedRoles = this.selectedRoles.filter(role => role?.uuid !== deselectedRole?.uuid);
  }

  saveAssignment() {
    let roleAssignment: any = {
      user: this.userUuid,
      roles: this.selectedRoles?.map(role => role?.uuid)
    }

    this.usersService.saveAssignment(roleAssignment ).subscribe(
      {
        next: () => {
          this.notificationMessage('Assignment saved successfully');
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error(error);
          this.notificationMessage('Failed to assign/unassign role');
        }
      }
    )
  }

  onClose(){
    this.dialogRef.close()
  }
}
