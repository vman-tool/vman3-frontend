import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'app/core/services/authentication/auth.service';
import { lastValueFrom } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-view-user',
  templateUrl: './view-user.component.html',
  styleUrl: './view-user.component.scss'
})
export class ViewUserComponent implements OnInit, AfterViewInit {
  
  user?: any;
  selectedRoles: any[] = [];
  searchterm: string = ''


  constructor(
    public dialogRef: MatDialogRef<ViewUserComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private usersService: UsersService
  ){}

  ngOnInit(): void {
    this.user = this.data?.user || '';
    this.getUserRoles();
  }

  getUserRoles(){
    this.usersService.getUserRoles(this.user?.uuid).subscribe(
      {
        next: (response:any) => {
          this.selectedRoles = response?.data?.roles;
        }
      }
    )
  }

  ngAfterViewInit() {
    const dialogElement = document.querySelector('.cdk-overlay-pane.mat-mdc-dialog-panel');
    if (dialogElement) {
      (dialogElement as HTMLElement).style.maxWidth = '100vw';
      (dialogElement as HTMLElement).style.minWidth = '0';
    }
  }

  filteredRoles() {
    return this.selectedRoles.filter(item =>
      item?.name?.toLowerCase().includes(this.searchterm.toLowerCase())
    );
  }


  onClose(){
    this.dialogRef.close()
  }
}
