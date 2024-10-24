import { Component, OnInit } from '@angular/core';
import { SystemImages } from '../../interface';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfigService } from 'app/app.service';
import { SettingConfigService } from '../../services/settings_configs.service';

interface PreviewImages {
  favicon?: string;
  logo?: string;
  home_image?: string;
}


@Component({
  selector: 'app-update-system-images',
  templateUrl: './update-system-images.component.html',
  styleUrl: './update-system-images.component.scss'
})
export class UpdateSystemImagesComponent implements OnInit {
  systemImages?: SystemImages;

  favicon?: any;
  logo?: any;
  home_image?: any;
  previewImages: PreviewImages = {};

  constructor(
    private snackBar: MatSnackBar,
    private configService: ConfigService,
    private settingConfigService: SettingConfigService,
  ){}


  notificationMessage(message: string): void {
    this.snackBar.open(`${message}`, 'close', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3 * 1000,
    });
  }

  ngOnInit(): void {
    this.loadSystemImages()
  }


  loadSystemImages(){
    this.settingConfigService.getSystemImages().subscribe(
      {
        next: async (response: any) => {
          if(response?.data?.length > 0){
            this.systemImages = response?.data[0]
            this.updateSystemImages()
          }
        },
        error: (error) => {
          this.notificationMessage("Failed to load system images")
        }
      }
    )
  }

  private updateSystemImages(){
    if(this.systemImages?.favicon == null || !this.systemImages.favicon){
      this.systemImages!.favicon = '../../../../../assets/icons/favicon.ico';
    }  else {
      this.systemImages!.favicon = this.configService.BASE_URL+ this.systemImages!.favicon;
      
    }
    
    if(this.systemImages?.logo == null || !this.systemImages.logo){
      this.systemImages!.logo = '../../../../../assets/images/vman_logo.png';
    } else {
      this.systemImages!.logo = this.configService.BASE_URL+ this.systemImages!.logo;
    }  
    
    if(this.systemImages?.home_image == null || !this.systemImages.home_image){
      this.systemImages!.home_image = '../../../../../assets/images/auth-bg.png';
    } else {
      this.systemImages!.home_image = this.configService.BASE_URL+ this.systemImages!.home_image;
    } 
    
  }

  onFileSelected(e: any, type: string): void {
    const fileInput = e?.target as HTMLInputElement;
    if (fileInput?.files?.length) {
      const file = fileInput.files[0];

      if (type === 'favicon') {
        this.favicon = file;
      } else if (type === 'logo') {
        this.logo = file;
      } else if (type === 'home_image') {
        this.home_image = file;
      }
      
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          this.previewImages = {
              ...this.previewImages,
              [type] : e?.target?.result
          };
        };
        reader.readAsDataURL(file);
      }
    }
  }

  resetPreview(type: 'favicon' | 'logo' | 'home_image'): void {
    if (this.previewImages[type]) {
      if (this.previewImages[type]?.startsWith('blob:')) {
        URL.revokeObjectURL(this.previewImages[type]!);
      }
      delete this.previewImages[type];
    }
  }

  onSaveImages(e: any){
    e?.stopPropagation()
    if(this.previewImages.logo || this.previewImages.home_image || this.previewImages.favicon){
      const imagesObject = {
        logo: this.logo,
        home_image: this.home_image,
        favicon: this.favicon,
      }

      this.settingConfigService.saveSystemImages(imagesObject).subscribe(
        {
          next: (response: any) => {
            if(response?.data){
              this.systemImages = response?.data[0]
              this.updateSystemImages()
              this.notificationMessage("System images updated successfully")
              this.resetAllPreview()
            } else {
              this.notificationMessage("Failed to update system images")
            }
          },
          error: (error) => {
            this.notificationMessage("Failed to update system images")
          }
        }
      )
    }
  }

  ngOnDestroy() {
    this.resetAllPreview()
  }

  private resetAllPreview(){
    Object.values(this.previewImages).forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

}
