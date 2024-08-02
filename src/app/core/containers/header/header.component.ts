import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
   isDropdownOpen = false;

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
}
