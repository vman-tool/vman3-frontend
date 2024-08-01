import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { AuthService } from '../../services/authentication/auth.service';

@Component({
  selector: 'app-body',
  templateUrl: './body.component.html',
  styleUrl: './body.component.scss'
})
export class BodyComponent {
  sidebarHidden: boolean = true;
  Openbar(e: any) {
      e.stopPropagation()
      this.sidebarHidden = !this.sidebarHidden
    }
}
