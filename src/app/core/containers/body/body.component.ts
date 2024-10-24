import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { AuthService } from '../../services/authentication/auth.service';
import { SettingConfigService } from '../../../modules/settings/services/settings_configs.service';
import { catchError, map } from 'rxjs';
import { settingsConfigData, SystemImages } from '../../../modules/settings/interface';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfigService } from 'app/app.service';

@Component({
  selector: 'app-body',
  templateUrl: './body.component.html',
  styleUrl: './body.component.scss',
})
export class BodyComponent implements OnInit {
  sidebarHidden: boolean = false;
  page_title = 'Ministry of Health Tanzania';
  page_subtitle?: string = 'Ministry of Health Tanzania';
  app_name = 'Verbal Autospy Management Tool';

  systemImages?: SystemImages;


  constructor(
    private settingsConfigsService: SettingConfigService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,

  ) {}
  ngOnInit(): void {
    this.loadSystemImages();
    this.initial();
  }

  initial() {
    this.settingsConfigsService
      .getSettingsConfig(true)
      .subscribe((config: settingsConfigData | null) => {
        if (
          config &&
          Object.keys(config.odk_api_configs).length &&
          Object.keys(config.odk_api_configs).length &&
          Object.keys(config.field_mapping).length
        ) {
          this.app_name = config.system_configs.app_name;
          this.page_title = config.system_configs.page_title;
          this.page_subtitle = config.system_configs.page_subtitle;
        } else {
          this.snackBar.open(
            'Please configure the system settings first!',
            'Close',
            {
              horizontalPosition: 'end',
              verticalPosition: 'top',
              duration: 3000,
            }
          );
        }
      });

    // catchError(() => {
    //   this.snackBar.open(
    //     'Unable to verify system settings. Please try again later.',
    //     'Close',
    //     {
    //       horizontalPosition: 'end',
    //       verticalPosition: 'top',
    //       duration: 3000,
    //     }
    //   );
    //   return false;
    // })
    // );
  }

  loadSystemImages(){
    this.settingsConfigsService.getSystemImages().subscribe(
      {
        next: async (response: any) => {
          if(response?.data?.length > 0){
            this.systemImages = response?.data[0]
            this.updateSystemImages()
          }
        },
        error: (error) => {
          console.log("Failed to load system images")
        }
      }
    )
  }

  private updateSystemImages(){
    if(this.systemImages && (this.systemImages?.logo == null || !this.systemImages?.logo)){
      this.systemImages!.logo = '../../../../assets/images/vman_logo.png';
    } else {
      this.systemImages = {
        ...this.systemImages,
        logo: this.configService.BASE_URL+ this.systemImages!.logo
      }
    }
    
  }


  Openbar(e: any) {
    e.stopPropagation();
    this.sidebarHidden = !this.sidebarHidden;
  }
}
