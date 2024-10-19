import { Component, OnInit } from '@angular/core';
import { AuthService } from 'app/core/services/authentication/auth.service';
import * as privileges  from 'app/shared/constants/privileges.constants';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  selectedTab = 'users-list'; 
  canViewRoles: boolean = false;
  canViewUsers: boolean = false;

  constructor(private authService: AuthService){}

  ngOnInit(){
    this.runPrivilegesCheck();
  }

  async runPrivilegesCheck() {
    this.canViewUsers = await lastValueFrom(this.authService.hasPrivilege([privileges.USERS_VIEW]))
    this.canViewRoles = await lastValueFrom(this.authService.hasPrivilege([privileges.USERS_VIEW_ROLES]))
  }
}
