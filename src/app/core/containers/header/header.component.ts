import { Component, HostListener, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfigService } from 'app/app.service';
import { AccountSettingsComponent } from 'app/core/dialogs/account-settings/account-settings.component';
import { AuthService } from 'app/core/services/authentication/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  isDropdownOpen = false;
  currentUser?: any;


  constructor(private authService: AuthService, private configService: ConfigService, private dialog: MatDialog){}

  ngOnInit(){
    this.getCurrentUser();
  }

  getCurrentUser(){
    const user = JSON.parse(localStorage.getItem('current_user') || "{}")
    this.currentUser = {
      ...user,
      image: user?.image && user?.image !== null ? this.configService.BASE_URL+user?.image : '../../../../assets/images/vman_profile.png'
    }
  }

  get documetationUrl(){
    return this.configService.DOCUMENTATION_URL
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

  onOpenAccountSettings(){
    this.dialog.open(AccountSettingsComponent, {
      width: '400px'
    }).afterClosed().subscribe((results: boolean) => {
      if(results){
        this.getCurrentUser();
      }
    });
  }

  onLogout() {
    this.authService.logout();
  }
}
