import { Component, HostListener } from '@angular/core';
import { AuthService } from 'app/core/services/authentication/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  isDropdownOpen = false;
  currentUser?: any;


  constructor(private authService: AuthService){}

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.currentUser = JSON.parse(localStorage.getItem('current_user') || "{}");
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
