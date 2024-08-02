import { Component, ElementRef, ViewChild } from '@angular/core';
import { AuthService } from '../../services/authentication/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  menuItems: any;
  selectedItem?: number = 0;
  selectedSubMenu: number = 0;

  constructor( private authService: AuthService) { }

    ngOnInit(): void {
      this.menuItems = [
        {
          displayText: 'Dashboard',
          icon: '',
          icon_asset: "../../../../assets/icons/dashboard.svg",
          route: '/'
        },
        {
          displayText: 'VA Records ',
          icon_asset: '../../../../assets/icons/ind-record.svg',
          route: '/records',
        },
        {
          displayText: 'PCVA',
          icon_asset: "../../../../assets/icons/pcva.svg",
          route: '/pcva',
          subMenuItems: [
            { 
              displayText: 'Coders',
              icon: 'flaticon-stethoscope',
              icon_asset: "",
              route: '/coders',
            },
            { 
              displayText: 'All Assigned',
              icon: 'flaticon-stethoscope',
              icon_asset: "",
              route: '/all-assigned',
            },
            { 
              displayText: 'Coded VA',
              icon: 'flaticon-stethoscope',
              icon_asset: "",
              route: '/coded-va',
            },
            { 
              displayText: 'Discordants',
              icon: 'flaticon-stethoscope',
              icon_asset: "",
              route: '/discordants',
            }
          ]
        },
        {
          displayText: 'Data Quality',
          icon_asset: "../../../../assets/icons/data.svg",
          route: '/pcva',
        },
        {
          displayText: 'Data Map',
          icon_asset: "../../../../assets/icons/data-map.svg",
          route: '/pcva',
        },
        {
          displayText: 'CCVA',
          icon_asset: "../../../../assets/icons/ccva.svg",
          route: '/pcva',
        },
        {
          displayText: 'Settings',
          icon_asset: "../../../../assets/icons/settings.svg",
          route: '/pcva',
        },

      ]
    }
    onSelectMenu(menuIndex: number, subMenuIndex?: number): void {
      this.selectedItem = this.selectedItem === menuIndex && !subMenuIndex ? undefined : menuIndex;
      
      if(subMenuIndex){
        this.selectedSubMenu = menuIndex+subMenuIndex;
      } else {
        this.selectedSubMenu = 0
      }
    }

    onLogout(){
      this.authService.logout();
    }
}
