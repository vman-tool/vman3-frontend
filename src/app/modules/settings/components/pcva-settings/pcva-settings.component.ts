import { Component } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-pcva-settings',
  templateUrl: './pcva-settings.component.html',
  styleUrl: './pcva-settings.component.scss'
})
export class PcvaSettingsComponent {
  selectedTab: string = "configuration";
}
