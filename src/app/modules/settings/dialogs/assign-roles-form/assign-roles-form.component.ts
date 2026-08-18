import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { lastValueFrom } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FieldLabel } from '../../interface';
import { LocationSelection } from '../../components/location-tree-select/location-tree-select.component';

@Component({
  standalone: false,
  selector: 'app-assign-roles-form',
  templateUrl: './assign-roles-form.component.html',
  styleUrl: './assign-roles-form.component.scss'
})
export class AssignRolesFormComponent implements OnInit {

  @Input() embedded_component: boolean = false;

  @Output() selectRoles: EventEmitter<any> = new EventEmitter()
  @Output() selectAccessLimit: EventEmitter<any> = new EventEmitter()
  // Lets an embedding parent (the Add/Edit User dialog) enforce the same
  // "a restricted creator can't grant unrestricted access" rule that
  // saveAssignment() enforces when this component saves on its own.
  @Output() canSelectNoLimitChange: EventEmitter<boolean> = new EventEmitter()

  availableRoles: any[] = [];
  selectedRoles: any[] = [];
  searchTermAvailable: string = '';
  searchSelectedRolesTerm: string = '';
  allRoles: any[] = [];
  userUuid: string = '';
  access_limit?: any;
  // The admin levels (Region/District/.../Village) this creator is allowed to
  // grant, already filtered so a level-restricted creator can never see a
  // broader level than their own (see getLocationFields()).
  locationTypes: any[] = [];
  // Flat list of checked leaves across all levels at once - a user can now
  // be restricted by a combination of values spanning several admin levels
  // (e.g. district_a OR ward_b), not just one level as before.
  selectedLocations: LocationSelection[] = [];
  // The creator's own restricted areas, if any - when non-empty, the tree
  // starts browsing from these places instead of Region, since a restricted
  // creator can only ever grant access within (or equal to) their own
  // boundary (enforced again server-side in assign_roles()).
  creatorBoundary: LocationSelection[] = [];

  field_labels?: FieldLabel[];
  canAssignRoles: any;
  canLimitDataAccess: boolean = false;
  canUpdateLimitLabels: boolean = false;
  // False when the creator's own access is itself restricted - in that case
  // they must restrict the new user to at least one location too, they
  // cannot hand out unrestricted ("no limit") access broader than their own.
  canSelectNoLimit: boolean = true;
  user: any;


  constructor(
    public dialogRef: MatDialogRef<AssignRolesFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private usersService: UsersService,
    private snackBar: MatSnackBar,
  ){}

  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }

  ngOnInit(): void {
    this.canAssignRoles = this.data?.canAssignRoles;
    this.canLimitDataAccess = this.data?.canLimitDataAccess;
    this.canUpdateLimitLabels = this.data?.canUpdateLimitLabels;
    this.user = this.data?.user;
    this.getLocationFields();
    this.getAllRoles();
  }

  getLocationFields() {
    const allLevels = [
      { label: this.data?.system_config?.admin_level1, value: this.data?.field_mapping?.location_level1, level: 1 },
      { label: this.data?.system_config?.admin_level2, value: this.data?.field_mapping?.location_level2, level: 2 },
      { label: this.data?.system_config?.admin_level3, value: this.data?.field_mapping?.location_level3, level: 3 },
      { label: this.data?.system_config?.admin_level4, value: this.data?.field_mapping?.location_level4, level: 4 }
    ];

    // A creator can itself be restricted across several levels; their
    // broadest permitted level is the lowest level number among those.
    const creatorAccessLimit = this.data?.current_user_access_limit;
    const legacyCreatorField: string = creatorAccessLimit?.field ?? '';
    this.creatorBoundary = (creatorAccessLimit?.limit_by || [])
      .map((item: any) => {
        const field = item?.field || legacyCreatorField;
        const levelDef = allLevels.find(l => l.value === field);
        return field && item?.value != null ? {
          field,
          field_label: levelDef?.label || field,
          label: item?.label || item?.value,
          value: item?.value,
        } : null;
      })
      .filter((item: any): item is LocationSelection => !!item);
    const creatorLevels = this.creatorBoundary
      .map(b => allLevels.find(l => l.value === b.field)?.level ?? 0)
      .filter((l: number) => l > 0);
    const creatorLevel = creatorLevels.length ? Math.min(...creatorLevels) : 0;

    this.canSelectNoLimit = creatorLevel === 0;
    this.canSelectNoLimitChange.emit(this.canSelectNoLimit);

    this.locationTypes = allLevels
      .filter(l => l.label && l.value)
      .filter(l => creatorLevel === 0 || l.level >= creatorLevel);

    this.field_labels = this.data?.field_labels;
  }


  async getAllRoles() {
    const rolesResponse: any = await lastValueFrom(this.usersService.getRoles({paging: false}))
    this.userUuid = this.user?.uuid || undefined;
    this.allRoles = rolesResponse?.data

    if(this.userUuid){
      const user_roles: any = await lastValueFrom(this.usersService.getUserRoles(this.userUuid))
      this.selectedRoles = user_roles?.data?.roles || [];
      this.access_limit = user_roles?.data?.access_limit
    }
    this.availableRoles = this.allRoles.filter((role: any) => !this.selectedRoles.some(selectedRole => selectedRole?.uuid === role?.uuid));

    // Supports both the legacy shape (a single top-level `field` shared by
    // all limit_by items) and the current shape (each item carries its own
    // `field`), so previously-saved users still render correctly.
    const legacyField = this.access_limit?.field;
    this.selectedLocations = (this.access_limit?.limit_by || [])
      .map((item: any) => {
        const field = item?.field || legacyField;
        const levelDef = this.locationTypes.find((lt: any) => lt.value === field);
        return {
          field,
          field_label: levelDef?.label || field,
          label: item?.label,
          value: item?.value,
        };
      })
      .filter((item: any) => !!item.field && item.value != null);

    if(!this.embedded_component){
      this.selectRoles.emit(this.selectedRoles);
      this.selectAccessLimit.emit(this.buildAccessLimit());
    }
  }

  filteredRoles() {
    return this.availableRoles.filter(role =>
      role?.name?.toLowerCase().includes(this.searchTermAvailable.toLowerCase())
    );
  }

  filteredSelectedRoles() {
    return this.selectedRoles.filter(role =>
      role?.name?.toLowerCase().includes(this.searchSelectedRolesTerm.toLowerCase())
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
    this.selectRoles.emit(this.selectedRoles);

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
    this.selectRoles.emit(this.selectedRoles);
  }

  onLocationSelectionChange(selection: LocationSelection[]): void {
    this.selectedLocations = selection;
    this.selectAccessLimit.emit(this.buildAccessLimit());
  }

  private buildAccessLimit(): any {
    if (!this.selectedLocations?.length) return {};
    return {
      limit_by: this.selectedLocations.map(item => ({
        field: item.field,
        field_label: item.field_label,
        label: item.label,
        value: item.value,
      })),
    };
  }

  saveAssignment() {
    if (this.canLimitDataAccess && !this.canSelectNoLimit && this.selectedLocations.length === 0) {
      this.notificationMessage('Your own account is access-limited, so you must restrict this user to at least one location.');
      return;
    }

    let roleAssignment: any = {
      user: this.userUuid,
      roles: this.selectedRoles?.map(role => role?.uuid),
      access_limit: this.buildAccessLimit(),
    }

    this.usersService.saveAssignment(roleAssignment).subscribe(
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
