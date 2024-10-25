import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FaviconService } from './shared/services/favicon.service';
import { SettingConfigService } from './modules/settings/services/settings_configs.service';
import { ConfigService } from './app.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'VMan';

  constructor(
    private faviconService: FaviconService, 
    private settingConfigService: SettingConfigService, 
    private configService: ConfigService,
    private titleService: Title
  ){}

  ngOnInit(): void {
    this.loadSystemSettings();
  }

  loadSystemSettings(){
    this.settingConfigService.getSystemImages().subscribe(
      {
        next: async (response: any) => {
          if(response?.data?.length > 0){
            const imagesData = response?.data[0]
            if(imagesData && imagesData?.favicon){
              this.faviconService.changeFavicon(this.configService.BASE_URL+imagesData?.favicon);
            }
          }
        },
        error: (error) => {
          console.log("Failed to load system images")
        }
      }
    )

    this.settingConfigService.getSettingsConfig().subscribe({
      next: async (response: any) => {
        this.titleService.setTitle(response?.system_configs?.app_name);
      },
      error: (error) => {
        console.log("Failed to load settings config")
      }
    })
  }
}
