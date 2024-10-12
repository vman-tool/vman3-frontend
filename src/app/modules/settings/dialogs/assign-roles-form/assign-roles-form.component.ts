import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { lastValueFrom } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { SettingConfigService } from '../../services/settings_configs.service';
import { FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { FieldLabel } from '../../interface';

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
  field_labels?: FieldLabel[];


  constructor(
    public dialogRef: MatDialogRef<AssignRolesFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private usersService: UsersService,
    private snackBar: MatSnackBar,
    private indexedDBService: IndexedDBService,
    private settingConfigService: SettingConfigService,
    private formBuilder: FormBuilder,
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

    this.field_labels = this.data?.field_labels
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

  get assignLabelsCheckbox(){
    return document.querySelector(".peer") as HTMLInputElement
  }

  async onSelectLocationType(e: any){
    e?.stopPropagation();
    this.loadLocations = true;
    this.selectedLocationType = this.locationTypes?.filter((locationType) => locationType?.value === e?.target?.value)[0]
    
    if(!this.selectedLocationType){
      if(this.assignLabelsCheckbox && this.assignLabels){
        this.assignLabelsCheckbox.dispatchEvent(new Event('change'));
      }
    }
    
    if(this.selectedLocationType){
      this.setLocations()
    }
    this.loadLocations = false;
  }

  async setLocations(){
    const saved_field_label = this.field_labels?.filter((field_label: any) => field_label?.field_id === this.selectedLocationType?.value)[0] || undefined
      const locationsFromQuestions = await lastValueFrom(this.settingConfigService.getUniqueValuesOfField(this.selectedLocationType?.value))
      let locationsObject: any = await this.indexedDBService.getQuestionsByKeys([this.selectedLocationType?.value])
      
      locationsObject = locationsObject?.length ? locationsObject?.filter((objectedLocation: any) => objectedLocation)[0] : undefined;
      
      if(locationsObject?.value?.options?.length && locationsFromQuestions?.data?.length){
        this.locations = locationsObject?.value?.options?.filter((locationToFilter: any) => locationsFromQuestions?.data?.some((location: any) => locationToFilter?.value === location))?.map((location: any) => {
          return {
            name: saved_field_label?.options?.hasOwnProperty(location?.value) ? saved_field_label?.options[location?.value] : location?.label,
            value: location?.value,
            unique: location?.value
          }
        })
      } else {
        this.locations = locationsFromQuestions?.data?.map((location: any) => {
          return {
            name: saved_field_label?.options?.hasOwnProperty(location) ? saved_field_label?.options[location] : location,
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

   onAssignLabels(event: any){
    this.assignLabels = event.target.checked && this.selectedLocationType;
    this.assignLabelsCheckbox.checked = this.assignLabels;

  }

  createForm(){
    this.labelsForm = this.formBuilder.group({});

    this.selectedLocations?.forEach(location => {
      this.labelsForm!.addControl(location.value, this.formBuilder.control(location?.name !== location.value ? location?.name : ''));
    });

    this.locations?.forEach(location => {
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
    if(this.assignLabels){
      const labelsForm = document.getElementById("labelsForm");
      if(labelsForm){
        labelsForm.dispatchEvent(new Event('submit'));
      }
    }
    else {

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
  }

  async onSubmitLabels(e: Event){
    let values: any = {};
    Object.keys(this.labelsForm.value)?.forEach((key: string) => {
      if(this.labelsForm.value[key]?.length){
        values = {
          ...values,
          [key]:this.labelsForm.value[key]
        }
      }
    })
    const labels_data = [
      {
        field_id: this.selectedLocationType?.value, 
        options: values
      }
    ]

    const saved_labels = await lastValueFrom(this.settingConfigService.saveConnectionData("field_labels", labels_data))
    if(!saved_labels?.error){
      this.loadLocations = true;
      const get_settings = await lastValueFrom(this.settingConfigService.getSettingsConfig())

      this.field_labels = get_settings?.field_labels

      this.setLocations()

      this.loadLocations = false;

      if(this.assignLabelsCheckbox){
        this.assignLabelsCheckbox.checked = false;
        this.assignLabelsCheckbox.dispatchEvent(new Event('change'));
      }

      this.notificationMessage('Labels saved successfully');
    } else {
      this.notificationMessage('Failed to save labels');
    }
    
  }

  onClose(){
    this.dialogRef.close()
  }
}
