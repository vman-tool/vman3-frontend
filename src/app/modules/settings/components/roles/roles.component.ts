import { Component, OnInit } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { RoleFormComponent } from '../../dialogs/role-form/role-form.component';

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
    private dialog: MatDialog
  ){}

  ngOnInit() {
    this.loadRoles()
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

  onEditRole(role: any){
    console.log("onEditRole", role);
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "60vw";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      role: role
    }
    this.dialog.open(RoleFormComponent, dialogConfig)
  }

  onPageChange(event: any) {
    this.pageNumber = event.pageIndex > 0 ? event.pageIndex + 1 : event.pageIndex;
    this.limit = Number(event?.pageSize);
    this.loadRoles();
  }
}
