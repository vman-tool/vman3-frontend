import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { AuthService } from '../../services/authentication/auth.service';

@Component({
  selector: 'app-body',
  templateUrl: './body.component.html',
  styleUrl: './body.component.scss'
})
export class BodyComponent {
  @ViewChild('sidebar') sidebar: ElementRef | undefined;
  humburgerHidden: Boolean = true;
  menuItems: any;
  selectedItem?: number = 0;

  constructor( private authService: AuthService) { }

    ngOnInit(): void {
      this.menuItems = [
        {
          displayText: 'Dashboard',
          icon: 'ph-gauge',
          route: '/'
        },
        {
          displayText: 'PCVA',
          icon: 'flaticon-stethoscope',
          route: '/dashboard',
          subMenuItems: [
            { 
              displayText: 'All Assigned',
              icon: '',
              route: '/all-assigned',
            },
            { 
              displayText: 'Coded VA',
              icon: '',
              route: '/coded-va',
            },
            { 
              displayText: 'Discordants',
              icon: '',
              route: '/discordants',
            }
          ]
        }
      ]
    }

    Openbar(e: any) {
      e.stopPropagation()
      if (this.sidebar) {
        this.sidebar.nativeElement.classList.toggle('hidden');
        this.humburgerHidden =!this.humburgerHidden;
      }
    }
    onSelectMenu(i: number) {
      this.selectedItem = this.selectedItem === i ? undefined : i;
    }

    onLogout(){
      this.authService.logout();
    }
}
