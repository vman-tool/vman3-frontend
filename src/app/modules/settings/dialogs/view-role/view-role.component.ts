import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'app/core/services/authentication/auth.service';
import { lastValueFrom } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-view-role',
  templateUrl: './view-role.component.html',
  styleUrl: './view-role.component.scss'
})
export class ViewRoleComponent implements OnInit, AfterViewInit {
  
  roleName?: string;
  roleUuid?: string;
  selectedPrivileges: string[] = [];
  searchterm: string = ''


  constructor(
    public dialogRef: MatDialogRef<ViewRoleComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ){}

  ngOnInit(): void {
    this.roleName = this.data?.role?.name || '';
    this.selectedPrivileges = this.data?.role?.privileges || [];
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
    }
  }

  filteredPrivileges() {
    return this.selectedPrivileges.filter(item =>
      item.toLowerCase().includes(this.searchterm.toLowerCase())
    );
  }


  onClose(){
    this.dialogRef.close()
  }
}
