import { Component } from '@angular/core';
import { AuthService } from '../../services/authentication/auth.service';
import { Router } from '@angular/router';
import { lastValueFrom, map } from 'rxjs';
import { VaRecordsService } from 'app/modules/pcva/services/va-records/va-records.service';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import * as privileges from 'app/shared/constants/privileges.constants';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  menuItems: any;
  selectedItem?: number = 0;
  selectedSubMenu: number = 0;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private vaRecordsService: VaRecordsService,
    private indexedDBService: IndexedDBService,
  ) {
  }

  async hasAccess(privileges: string[]){
    return await lastValueFrom(this.authService.hasPrivilege(privileges))
  }
  
  async ngOnInit(): Promise<void> {
    this.menuItems = [
      {
        displayText: 'Dashboard',
        icon: '',
        icon_asset: '../../../../assets/icons/dashboard.svg',
        route: '/dashboard',
        hasAccess: true,
      },
      {
        displayText: 'VA Records ',
        icon_asset: '../../../../assets/icons/ind-record.svg',
        route: '/records',
        hasAccess: true,
      },
      {
        displayText: 'Data Quality',
        icon_asset: '../../../../assets/icons/data.svg',
        route: '/data-quality',
        hasAccess: true,
      },
      {
        displayText: 'Data Map',
        icon_asset: '../../../../assets/icons/data-map.svg',
        route: '/data-map',
        hasAccess: true,
      },
      {
        displayText: 'PCVA',
        icon_asset: '../../../../assets/icons/pcva.svg',
        route: '/pcva',
        hasAccess: await this.hasAccess([privileges.PCVA_MODULE_ACCESS]),
        subMenuItems: [
          {
            displayText: 'Coders',
            icon: 'flaticon-stethoscope',
            icon_asset: '',
            route: '/coders',
            hasAccess: true,
          },
          {
            displayText: 'All Assigned',
            icon: 'flaticon-stethoscope',
            icon_asset: '',
            route: '/all-assigned',
            hasAccess: true,
          },
          {
            displayText: 'Coded VA',
            icon: 'flaticon-stethoscope',
            icon_asset: '',
            route: '/coded-va',
            hasAccess: true,
          },
          {
            displayText: 'Discordants',
            icon: 'flaticon-stethoscope',
            icon_asset: '',
            route: '/discordants',
            hasAccess: true,
          },
        ],
      },
      {
        displayText: 'CCVA',
        icon_asset: '../../../../assets/icons/ccva.svg',
        route: '/ccva',
        hasAccess: true,
      },
      {
        displayText: 'Settings',
        icon_asset: '../../../../assets/icons/settings.svg',
        route: '/settings',
        hasAccess: await this.hasAccess([privileges.SETTINGS_MODULE_VIEW]),
        subMenuItems: [
          {
            displayText: 'Configurations',
            icon: 'flaticon-setting', // Replace with the actual Flaticon class for a gear/settings icon
            icon_asset: '',
            route: '/configurations',
            hasAccess: await this.hasAccess([privileges.SETTINGS_CONFIGS_VIEW]),
          },
          {
            displayText: 'Data Synchronization',
            icon: 'flaticon-target', // Replace with the actual Flaticon class for a sync/refresh icon
            icon_asset: '',
            route: '/sync',
            hasAccess: await this.hasAccess([privileges.ODK_MODULE_VIEW]),
          },
          {
            displayText: 'Users',
            icon: 'flaticon-people', // Replace with the actual Flaticon class for a sync/refresh icon
            icon_asset: '',
            route: '/users',
            hasAccess: await this.hasAccess([privileges.USERS_MODULE_VIEW])
          },
        ],
      },
    ];

    for(var i = 0; i < this.menuItems.length; i++){
      if(this.router!.url.includes(this.menuItems[i]?.route)){
        this.selectedItem = i;
        
        if(this.menuItems[i].subMenuItems?.length){
          for(var j = 1; j < this.menuItems[i]?.subMenuItems?.length; j++){
            if(this.router!.url.includes(this.menuItems[i].subMenuItems[j]?.route)){
              this.selectedSubMenu = i+(j+1);
              break;
            }
            if(!this.selectedSubMenu){
              this.selectedSubMenu = i+1;
            }
          }
        }
      }
    }

    const questions = await this.indexedDBService.getQuestions();

    if(!questions.length){
      await lastValueFrom(this.vaRecordsService.getQuestions().pipe(
        map(async (response: any) => {
          if(response?.data){
            await this.indexedDBService.addQuestions(response?.data);
            await this.indexedDBService.addQuestionsAsObject(response?.data);
          }
        })
      ));
    }
  }
  onSelectMenu(menuIndex: number, subMenuIndex?: number): void {
    this.selectedItem =
      this.selectedItem === menuIndex && !subMenuIndex ? undefined : menuIndex;

    if (subMenuIndex) {
      this.selectedSubMenu = menuIndex + subMenuIndex;
    } else {
      this.selectedSubMenu = menuIndex + 1;
    }
  }

  onLogout() {
    this.authService.logout();
  }
}
