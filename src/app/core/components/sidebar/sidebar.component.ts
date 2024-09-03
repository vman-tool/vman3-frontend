import { Component, ElementRef, ViewChild } from '@angular/core';
import { AuthService } from '../../services/authentication/auth.service';
import { Router } from '@angular/router';
import { VaRecordsService } from 'app/modules/pcva/services/va-records/va-records.service';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';
import { lastValueFrom, map } from 'rxjs';

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
    private indexedDBService: IndexedDBService
  ) {
  }

  async ngOnInit(): Promise<void> {
    this.menuItems = [
      {
        displayText: 'Dashboard',
        icon: '',
        icon_asset: '../../../../assets/icons/dashboard.svg',
        route: '/dashboard',
      },
      {
        displayText: 'VA Records ',
        icon_asset: '../../../../assets/icons/ind-record.svg',
        route: '/records',
      },
      {
        displayText: 'Data Quality',
        icon_asset: '../../../../assets/icons/data.svg',
        route: '/data-quality',
      },
      {
        displayText: 'Data Map',
        icon_asset: '../../../../assets/icons/data-map.svg',
        route: '/data-map',
      },
      {
        displayText: 'PCVA',
        icon_asset: '../../../../assets/icons/pcva.svg',
        route: '/pcva',
        subMenuItems: [
          {
            displayText: 'Coders',
            icon: 'flaticon-stethoscope',
            icon_asset: '',
            route: '/coders',
          },
          {
            displayText: 'All Assigned',
            icon: 'flaticon-stethoscope',
            icon_asset: '',
            route: '/all-assigned',
          },
          {
            displayText: 'Coded VA',
            icon: 'flaticon-stethoscope',
            icon_asset: '',
            route: '/coded-va',
          },
          {
            displayText: 'Discordants',
            icon: 'flaticon-stethoscope',
            icon_asset: '',
            route: '/discordants',
          },
        ],
      },
      {
        displayText: 'CCVA',
        icon_asset: '../../../../assets/icons/ccva.svg',
        route: '/ccva',
      },
      {
        displayText: 'Settings',
        icon_asset: '../../../../assets/icons/settings.svg',
        route: '/settings',
        subMenuItems: [
          {
            displayText: 'Configurations',
            icon: 'flaticon-setting', // Replace with the actual Flaticon class for a gear/settings icon
            icon_asset: '',
            route: '/configurations',
          },
          {
            displayText: 'Data Synchronization',
            icon: 'flaticon-target', // Replace with the actual Flaticon class for a sync/refresh icon
            icon_asset: '',
            route: '/sync',
          },
          {
            displayText: 'Users',
            icon: 'flaticon-people', // Replace with the actual Flaticon class for a sync/refresh icon
            icon_asset: '',
            route: '/users',
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

    await lastValueFrom(this.vaRecordsService.getQuestions().pipe(
      map((response: any) => {
        this.indexedDBService.addQuestions(response?.data);
        this.indexedDBService.addQuestionsAsObject(response?.data);
      })
    ))
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
