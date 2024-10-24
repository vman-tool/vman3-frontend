import { Component, HostListener, OnInit } from '@angular/core';
import { ConfigService } from 'app/app.service';
import { AuthService } from 'app/core/services/authentication/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  isDropdownOpen = false;
  currentUser?: any;


  constructor(private authService: AuthService, private configService: ConfigService){}

  ngOnInit(){
    this.currentUser = {
      ...JSON.parse(localStorage.getItem('current_user') || "{}"),
      image: this.currentUser?.image && this.currentUser?.image !== null ? this.configService.BASE_URL+this.currentUser.image : '../../../../assets/images/vman_profile.png'
    }
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: Event) {
    const target = event.target as HTMLElement;
    const dropdown = document.getElementById('dropdown');
    const userMenuButton = document.getElementById('user-menu-button');

    if (dropdown && userMenuButton && !dropdown.contains(target) && !userMenuButton.contains(target)) {
      this.isDropdownOpen = false;
    }
  }

  onLogout() {
    this.authService.logout();
  }
}
