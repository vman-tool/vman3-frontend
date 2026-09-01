import { Component, OnInit } from '@angular/core';
import { SystemImages } from '../../interface';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfigService } from 'app/app.service';
import { SettingConfigService } from '../../services/settings_configs.service';

type ImageType = 'favicon' | 'logo' | 'home_image';

interface PreviewImages {
  favicon?: string;
  logo?: string;
  home_image?: string;
}

interface ImageValidationRule {
  maxSizeBytes: number;
  minWidth: number;
  minHeight: number;
  label: string;
}

// Mirrors backend/app/settings/settings_routes.py's IMAGE_VALIDATION_RULES -
// kept in sync manually since the two apps don't share a schema. The
// backend is the authority (this is just for fast, friendly feedback
// before a round trip); it re-validates independently on upload.
const IMAGE_VALIDATION_RULES: Record<ImageType, ImageValidationRule> = {
  favicon: { maxSizeBytes: 512 * 1024, minWidth: 16, minHeight: 16, label: 'Favicon' },
  logo: { maxSizeBytes: 5 * 1024 * 1024, minWidth: 64, minHeight: 64, label: 'Logo' },
  home_image: { maxSizeBytes: 5 * 1024 * 1024, minWidth: 200, minHeight: 200, label: 'Login image' },
};

const VALID_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'ico', 'svg', 'gif', 'webp'];

@Component({
  standalone: false,
  selector: 'app-update-system-images',
  templateUrl: './update-system-images.component.html',
  styleUrl: './update-system-images.component.scss'
})
export class UpdateSystemImagesComponent implements OnInit {
  systemImages?: SystemImages;
  // The untransformed values from the backend (undefined/null when a given
  // image was never uploaded) - systemImages itself gets overwritten with
  // fallback default-asset paths for display, so this is what decides
  // whether a per-image Reset button is enabled.
  private rawSystemImages: SystemImages = {};

  favicon?: any;
  logo?: any;
  home_image?: any;
  previewImages: PreviewImages = {};
  validationErrors: Partial<Record<ImageType, string>> = {};
  canReset: boolean = false;
  resettingImage: ImageType | null = null;

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
    // Bypass the client-side cache here - this admin screen must always
    // reflect what's actually saved, not a stale snapshot from before a
    // save/reset made elsewhere in the same session.
    this.settingConfigService.getSystemImages(false).subscribe(
      {
        next: async (response: any) => {
          if(response?.data?.length > 0){
            this.systemImages = response?.data[0]
            this.rawSystemImages = { ...this.systemImages };
            this.canReset = ((this.systemImages?.favicon !== null && this.systemImages?.favicon) || (this.systemImages?.logo !== null && this.systemImages?.logo) || (this.systemImages?.home_image !== null && this.systemImages?.home_image)) as boolean;
          }
          this.updateSystemImages()
        },
        error: (error) => {
          this.notificationMessage("Failed to load system images")
        }
      }
    )
  }

  hasCustomImage(type: ImageType): boolean {
    return !!this.rawSystemImages?.[type];
  }

  private updateSystemImages(){
    if(this.systemImages === null || this.systemImages?.favicon === null || !this.systemImages?.favicon){
      this.systemImages = {
        ...this.systemImages,
        favicon: '../../../../../assets/icons/favicon.ico'
      }
    }  else {
      this.systemImages = {
        ...this.systemImages,
        favicon: this.configService.BASE_URL+ this.systemImages!.favicon
      }

    }

    if(this.systemImages === null || this.systemImages?.logo === null || !this.systemImages?.logo){
      this.systemImages = {
        ...this.systemImages,
        logo: '../../../../../assets/images/vman_logo.png'
      }
    } else {
      this.systemImages = {
        ...this.systemImages,
        logo: this.configService.BASE_URL+ this.systemImages!.logo
      }
    }

    if(this.systemImages === null || this.systemImages?.home_image === null || !this.systemImages?.home_image){
      this.systemImages = {
        ...this.systemImages,
        home_image: '../../../../../assets/images/auth-bg.png'
      }
    } else {
      this.systemImages = {
        ...this.systemImages,
        home_image: this.configService.BASE_URL+ this.systemImages!.home_image
      }
    }

  }

  onFileSelected(e: any, type: ImageType): void {
    const fileInput = e?.target as HTMLInputElement;
    if (!fileInput?.files?.length) {
      return;
    }
    const file = fileInput.files[0];
    delete this.validationErrors[type];

    this.validateImageFile(file, type).then((error) => {
      if (error) {
        this.validationErrors[type] = error;
        this.notificationMessage(error);
        fileInput.value = '';
        return;
      }

      if (type === 'favicon') {
        this.favicon = file;
      } else if (type === 'logo') {
        this.logo = file;
      } else if (type === 'home_image') {
        this.home_image = file;
      }

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.previewImages = {
          ...this.previewImages,
          [type]: e?.target?.result,
        };
      };
      reader.readAsDataURL(file);
    });
  }

  // Extension + size are checked synchronously; actual decodability and
  // pixel dimensions need the browser to load the file, which is async.
  // SVG is vector (no fixed pixel grid, and the browser's Image element
  // can still decode it fine), so it skips the dimension check.
  private validateImageFile(file: File, type: ImageType): Promise<string | null> {
    const rule = IMAGE_VALIDATION_RULES[type];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!VALID_IMAGE_EXTENSIONS.includes(extension)) {
      return Promise.resolve(
        `${rule.label}: unsupported file type ".${extension}". Allowed: ${VALID_IMAGE_EXTENSIONS.join(', ')}.`
      );
    }

    if (file.size > rule.maxSizeBytes) {
      const maxMb = (rule.maxSizeBytes / 1024 / 1024).toFixed(1);
      const actualMb = (file.size / 1024 / 1024).toFixed(1);
      return Promise.resolve(`${rule.label}: file is too large (${actualMb} MB). Maximum is ${maxMb} MB.`);
    }

    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        if (extension !== 'svg' && (image.naturalWidth < rule.minWidth || image.naturalHeight < rule.minHeight)) {
          resolve(
            `${rule.label}: image is too small (${image.naturalWidth}x${image.naturalHeight}px). ` +
            `Minimum is ${rule.minWidth}x${rule.minHeight}px.`
          );
          return;
        }
        resolve(null);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(`${rule.label}: file could not be read as an image - it may be corrupted.`);
      };
      image.src = objectUrl;
    });
  }

  resetPreview(type: ImageType): void {
    delete this.validationErrors[type];
    if (this.previewImages[type]) {
      if (this.previewImages[type]?.startsWith('blob:')) {
        URL.revokeObjectURL(this.previewImages[type]!);
      }
      delete this.previewImages[type];
    }
  }

  onResetImages(e: any){
    e?.stopPropagation();
    if(this.canReset){
      this.settingConfigService.resetImages().subscribe({
        next: (response: any) => {
          if(response?.data){
            this.systemImages = response?.data[0]
            this.rawSystemImages = { ...this.systemImages };
            this.canReset = false;
            this.updateSystemImages()
            this.notificationMessage("System images reset successfully")
            this.resetAllPreview();
          } else {
            this.notificationMessage("Failed to reset system images")
          }
        },
        error: (error) => {
          this.notificationMessage("Failed to reset system images")
        }
      })
    } else {
      this.resetAllPreview();
    }
  }

  // Resets just one image back to its default, leaving the other two
  // (custom or otherwise) untouched.
  onResetSingleImage(type: ImageType): void {
    if (!this.hasCustomImage(type) || this.resettingImage) {
      return;
    }
    this.resettingImage = type;
    this.settingConfigService.resetSingleImage(type).subscribe({
      next: (response: any) => {
        this.resettingImage = null;
        if (response?.data) {
          this.systemImages = response.data[0];
          this.rawSystemImages = { ...this.systemImages };
          this.canReset = !!(this.rawSystemImages.favicon || this.rawSystemImages.logo || this.rawSystemImages.home_image);
          this.updateSystemImages();
          this.resetPreview(type);
          this.notificationMessage(`${IMAGE_VALIDATION_RULES[type].label} reset to default`);
        } else {
          this.notificationMessage(`Failed to reset ${IMAGE_VALIDATION_RULES[type].label.toLowerCase()}`);
        }
      },
      error: () => {
        this.resettingImage = null;
        this.notificationMessage(`Failed to reset ${IMAGE_VALIDATION_RULES[type].label.toLowerCase()}`);
      },
    });
  }

  onSaveImages(e: any){
    e?.stopPropagation()
    if (this.validationErrors.favicon || this.validationErrors.logo || this.validationErrors.home_image) {
      this.notificationMessage('Fix the highlighted image(s) before saving.');
      return;
    }
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
              this.rawSystemImages = { ...this.systemImages };
              this.canReset = true;
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
    this.previewImages = {};
    this.validationErrors = {};
    this.favicon = undefined;
    this.logo = undefined;
    this.home_image = undefined;
  }

}
