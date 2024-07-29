import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, Inject, ViewChild } from '@angular/core';

@Component({
  selector: 'app-body',
  templateUrl: './body.component.html',
  styleUrl: './body.component.scss'
})
export class BodyComponent {
  @ViewChild('sidebar') sidebar: ElementRef | undefined;
  @ViewChild('subMenu') subMenu: ElementRef | undefined;
  @ViewChild('subMenuIcon') subMenuIcon: ElementRef | undefined;
  humburgerHidden: Boolean = true;
  menuItems: any;

  constructor(@Inject(DOCUMENT) private document: Document) { }

    ngOnInit(): void {
      this.menuItems = [
        {
          displayText: 'Dashboard',
          icon: 'ph-gauge',
          route: '/'
        },
        {
          displayText: 'PCVA',
          icon: 'ph-gauge',
          route: '/dashboard',
          subMenuItems: [
            { 
              displayText: 'Dashboard',
              icon: 'ph-gauge',
              route: '/dashboard',
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
    dropDown() {
      // TODO: Re think logic for dropdown functionality on the submenu
     if(this.subMenu && this.subMenuIcon){
       this.subMenu.nativeElement.classList.toggle('hidden')
       this.subMenuIcon?.nativeElement.classList.toggle('rotate-180')
     }
    }
}
