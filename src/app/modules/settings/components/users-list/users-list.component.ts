import { Component, Input, OnInit } from '@angular/core';
import { UsersService } from '../../services/users.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { catchError, debounceTime, lastValueFrom, map, Observable, Subject, Subscription } from 'rxjs';
import { AssignRolesFormComponent } from '../../dialogs/assign-roles-form/assign-roles-form.component';
import { UserFormComponent } from '../../dialogs/user-form/user-form.component';
import { ViewUserComponent } from '../../dialogs/view-user/view-user.component';
import { SharedConfirmationComponent } from 'app/shared/dialogs/shared-confirmation/shared-confirmation.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SettingConfigService } from '../../services/settings_configs.service';
import { FieldLabel, FieldMapping, OdkConfigModel, settingsConfigData, SystemConfig } from '../../interface';
import { AuthService } from 'app/core/services/authentication/auth.service';
import * as privileges  from 'app/shared/constants/privileges.constants';

@Component({
  standalone: false,
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss'
})
export class UsersListComponent implements OnInit {

  usersData$?: Observable<any>;
  loadingData: boolean = false;
  pageNumber?: number = 0;
  limit?: number = 10;

  systemConfigData: SystemConfig | undefined;
  fieldMappingData: FieldMapping | undefined;
  vaSummaryData: string[] = [];
  fieldLabels: FieldLabel[] | undefined;
  canAddUsers: boolean = false;
  canUpdateUsers: boolean = false;
  canDeactivateUser: boolean = false;
  canAssignRoles: boolean = false;
  canLimitDataAccess: boolean = false;
  canUpdateLimitLabels: boolean = false;
  current_user?: any;

  searchTerm: string = "";
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription;
  
  constructor(
    private usersService: UsersService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private settingConfigService: SettingConfigService,
    private authService: AuthService
  ){
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(500))
      .subscribe(() => {
        this.loadUsers();
      });
  }

  ngOnInit(): void {
    this.current_user = JSON.parse(localStorage.getItem("current_user") || "{}");
    this.authService.get_user().subscribe({
      next: (user: any) => { if (user && !user.error) this.current_user = user; }
    });
    this.runPrivilegesCheck()
    this.loadUsers()
    this.loadSystemConfigurations()
  }

  async runPrivilegesCheck() {
    this.canAddUsers = await lastValueFrom(this.authService.hasPrivilege([privileges.USERS_CREATE_USER]))
    this.canUpdateUsers = await lastValueFrom(this.authService.hasPrivilege([privileges.USERS_UPDATE_USER]))
    this.canDeactivateUser = await lastValueFrom(this.authService.hasPrivilege([privileges.USERS_DEACTIVATE_USER]))
    this.canAssignRoles = await lastValueFrom(this.authService.hasPrivilege([privileges.USERS_ASSIGN_ROLES, privileges.USERS_VIEW_ROLES]))
    this.canLimitDataAccess = await lastValueFrom(this.authService.hasPrivilege([privileges.USERS_LIMIT_DATA_ACCESS]))
    this.canUpdateLimitLabels = await lastValueFrom(this.authService.hasPrivilege([privileges.USERS_UPDATE_ACCESS_LIMIT_LABELS]))
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
    console.log("Loading users at page number:", this.pageNumber);
    this.usersData$ = this.usersService.getUsers(
      {
        paging: true,
        page_number: this.pageNumber,
        limit: this.limit,
      },
      "false",
      this.searchTerm
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

  loadSystemConfigurations(){
    this.settingConfigService.getSettingsConfig().subscribe({
      next: async (data: settingsConfigData | null) => {
        if (!!data) {
          this.systemConfigData = data?.system_configs;
          this.fieldMappingData = data?.field_mapping;
          this.fieldLabels = data?.field_labels;
        }
      },
      error: (error) => {
        console.error('Failed to load Configurations:', error);
      }
    })  
  }

  onSearchChange(e: any){
    this.pageNumber = 0;
    this.searchSubject.next(this.searchTerm);
  }

  onAssignRoles(user: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "80vw";
    dialogConfig.maxWidth = "1100px";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      user: user,
      system_config: this.systemConfigData,
      field_mapping: this.fieldMappingData,
      field_labels: this.fieldLabels,
      canLimitDataAccess: this.canLimitDataAccess,
      canUpdateLimitLabels: this.canUpdateLimitLabels,
      canAssignRoles: this.canAssignRoles,
      current_user_access_limit: this.current_user?.access_limit
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
    dialogConfig.width = "80vw";
    dialogConfig.maxWidth = "1100px";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      system_config: this.systemConfigData,
      field_mapping: this.fieldMappingData,
      field_labels: this.fieldLabels,
      canLimitDataAccess: this.canLimitDataAccess,
      canUpdateLimitLabels: this.canUpdateLimitLabels,
      canAssignRoles: this.canAssignRoles,
      current_user_access_limit: this.current_user?.access_limit
    }
    this.dialog.open(UserFormComponent, dialogConfig).afterClosed().subscribe({
      next: (response) => {
        if(response) this.loadUsers();
      }})
  }

  onEditUser(user: any){
    let dialogConfig = new MatDialogConfig();
    dialogConfig.autoFocus = true;
    dialogConfig.width = "80vw";
    dialogConfig.maxWidth = "1100px";
    dialogConfig.panelClass = "cdk-overlay-pane"
    dialogConfig.data = {
      user: user,
      system_config: this.systemConfigData,
      field_mapping: this.fieldMappingData,
      field_labels: this.fieldLabels,
      canLimitDataAccess: this.canLimitDataAccess,
      canUpdateLimitLabels: this.canUpdateLimitLabels,
      canAssignRoles: this.canAssignRoles,
      current_user_access_limit: this.current_user?.access_limit
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

  getRoleNames(user: any): string {
    return user?.roles?.map((r: any) => r.name).filter(Boolean).join(', ') || '-';
  }

  getAccessLevelLabel(user: any): string {
    const accessLimit = user?.access_limit;
    const limitBy: any[] = accessLimit?.limit_by || [];
    if (!limitBy.length) return '-';

    const map: Record<string, string | undefined> = {
      [this.fieldMappingData?.location_level1 || '']: this.systemConfigData?.admin_level1,
      [this.fieldMappingData?.location_level2 || '']: this.systemConfigData?.admin_level2,
      [this.fieldMappingData?.location_level3 || '']: this.systemConfigData?.admin_level3,
      [this.fieldMappingData?.location_level4 || '']: this.systemConfigData?.admin_level4,
    };

    // Supports both the legacy shape (a single top-level `field` shared by
    // all limit_by items) and the current shape (each item carries its own
    // `field`, since a user can now be restricted across several levels).
    const legacyField = accessLimit?.field;
    const groups = new Map<string, string[]>();
    for (const item of limitBy) {
      const field = item?.field || legacyField;
      const label = item?.label || item?.value;
      if (!field || !label) continue;
      if (!groups.has(field)) groups.set(field, []);
      groups.get(field)!.push(label);
    }
    if (!groups.size) return '-';

    return Array.from(groups.entries())
      .map(([field, values]) => `${map[field] || field} (${values.join(', ')})`)
      .join('; ');
  }

  onPageChange(event: any) {
    this.pageNumber = this.pageNumber == 0 && this.pageNumber < event.pageIndex ? event.pageIndex + 1 : this.pageNumber !== 0 && this.pageNumber! > event.pageIndex ? event.pageIndex - 1 : event.pageIndex;
    this.pageNumber = this.pageNumber! < 0 ? 0 : this.pageNumber;
    this.limit = Number(event?.pageSize);
    this.loadUsers();
  }
}
