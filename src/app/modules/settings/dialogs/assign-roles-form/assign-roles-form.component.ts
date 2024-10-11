import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { lastValueFrom } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { SettingConfigService } from '../../services/settings_configs.service';
import { FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';

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
  access_limit?: any;
  locationTypes: any[] = [];
  locations: any[] = [];
  loadLocations: boolean = false;
  selectedLocations: any[] = [];
  selectedLocationType?: any;
  availableLocationsSearchTerm: string = '';
  selectedLocationsSearchTerm: string = '';
  assignLabels: any;
  labelsForm: any;


  constructor(
    public dialogRef: MatDialogRef<AssignRolesFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private usersService: UsersService,
    private snackBar: MatSnackBar,
    private indexedDBService: IndexedDBService,
    private settingConfigService: SettingConfigService,
    private formBuilder: FormBuilder
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
    this.getLocationFields();
  }

  getLocationFields() {
    this.locationTypes = [
      { label: this.data?.system_config?.admin_level1, value:  this.data?.field_mapping?.location_level1},
      { label: this.data?.system_config?.admin_level2, value:  this.data?.field_mapping?.location_level2},
      { label: this.data?.system_config?.admin_level3, value:  this.data?.field_mapping?.location_level3},
      { label: this.data?.system_config?.admin_level4, value:  this.data?.field_mapping?.location_level4}
    ]
  }
  

  async getAllRoles() {
    const rolesResponse: any = await lastValueFrom(this.usersService.getRoles({paging: false}))
    this.userUuid = this.data?.user?.uuid || '';
    const user_roles: any = await lastValueFrom(this.usersService.getUserRoles(this.userUuid))
    this.allRoles = rolesResponse?.data
    this.selectedRoles = user_roles?.data?.roles || [];
    this.access_limit = user_roles?.data?.access_limit
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

  async onSelectLocationType(e: any){
    e?.stopPropagation();
    this.loadLocations = true;
    this.selectedLocationType = this.locationTypes?.filter((locationType) => locationType?.value === e?.target?.value)[0]
    
    if(!this.selectedLocationType){
      this.assignLabels = false

      let checkbox = document.querySelector(".peer") as HTMLInputElement
      if(checkbox){
        checkbox.dispatchEvent(new Event('change'));
        checkbox.checked = false
      }
    }
    
    if(this.selectedLocationType){
      const locationsObject: any = await this.indexedDBService.getQuestionsByKeys([this.selectedLocationType?.value])
      this.locations = locationsObject?.filter((location: any) => location)[0]?.value?.options?.map((location: any) => {
        return {
          name: location?.label,
          value: location?.value,
          unique: location?.value
        }
      })

      if(!this.locations?.length){
        const locations = await lastValueFrom(this.settingConfigService.getUniqueValuesOfField(this.selectedLocationType?.value))
        this.locations = locations?.data?.map((location: any) => {
          return {
            name: location,
            value: location,
            unique: location
          }
        }) || []
      }
      if(this.access_limit && this.selectedLocationType?.value === this.access_limit?.field){
        this.selectedLocations = this.locations?.filter((location) => this.access_limit?.limit_by?.some((access_limit: any) => location?.value === access_limit?.value))
        this.locations = this.locations?.filter((location) => !this.access_limit?.limit_by?.some((access_limit: any) => location?.value === access_limit?.value))
      }
      if(this.access_limit && this.selectedLocationType?.value !== this.access_limit?.field){
        this.selectedLocations = []
      }
      this.createForm()
    }
    this.loadLocations = false;
  }

   onAssignLabels(event: any){
    this.assignLabels = event.target.checked && this.selectedLocationType;

  }

  createForm(){
    this.labelsForm = this.formBuilder.group({});
    if(this.selectedLocations)
    this.locations.forEach(location => {
      this.labelsForm!.addControl(location.value, this.formBuilder.control(location?.name !== location.value ? location?.name : ''));
    });
  }


  filteredLocations() {
    return this.locations?.filter(location =>
      location?.name?.toLowerCase().includes(this.availableLocationsSearchTerm.toLowerCase())
    );
  }
  
  filteredSelectedLocations() {
    return this.selectedLocations.filter(location =>
      location?.name?.toLowerCase().includes(this.searchTermAvailable.toLowerCase())
    );
  }

  moveLocationToSelected(selectedLocation: any) {
    this.selectedLocations = [
      ...this.selectedLocations,
      selectedLocation
    ].sort((locationA, locationB) => {
        if (locationA.name < locationB.name) {
          return -1;
        } else {
          return 1;
        }
      });
    this.locations = this.locations.filter(location => location?.unique !== selectedLocation?.unique);
  }

  moveLocationToAvailable(deselectedLocation: any) {
    this.locations = [
      ...this.locations,
      deselectedLocation
    ].sort((locationA, locationB) => {
        if (locationA.name < locationB.name) {
          return -1;
        } else {
          return 1;
        }
      })
    this.selectedLocations = this.selectedLocations.filter(location => location?.unique !== deselectedLocation?.unique);
  }

  saveAssignment() {
    let roleAssignment: any = {
      user: this.userUuid,
      roles: this.selectedRoles?.map(role => role?.uuid)
    }

    if(this.selectedLocations?.length){
      roleAssignment.access_limit = {
        field: this.selectedLocationType?.value,
        limit_by: this.selectedLocations?.map((location) => {
          return {
            label: location?.name,
            value: location?.value
          }
        }
        )
      }
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
