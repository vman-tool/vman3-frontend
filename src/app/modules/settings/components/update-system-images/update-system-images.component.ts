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
  // whether a given image has anything to reset or download as "custom".
  private rawSystemImages: SystemImages = {};

  // Shown immediately (from the local file, before the upload round trip
  // resolves) so the picture updates the instant a file is chosen -
  // selecting a file uploads and saves it in one step, there's no separate
  // "Save" to confirm.
  previewImages: PreviewImages = {};
  validationErrors: Partial<Record<ImageType, string>> = {};
  canReset: boolean = false;
  resettingImage: ImageType | null = null;
  uploadingImage: ImageType | null = null;

  readonly imageLabels = IMAGE_VALIDATION_RULES;

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

  // Choosing a file validates, previews, and uploads it in one step - it
  // replaces the existing image immediately, there's no separate Save.
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

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.previewImages = {
          ...this.previewImages,
          [type]: e?.target?.result,
        };
        // Only start the upload once the preview is actually showing - the
        // response (clearing the preview in favor of the real saved URL)
        // must never be able to arrive before the preview is set, or it'd
        // be immediately overwritten right back to the stale image.
        this.uploadImage(file, type);
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });
  }

  private uploadImage(file: File, type: ImageType): void {
    this.uploadingImage = type;
    this.settingConfigService.saveSystemImages({ [type]: file }).subscribe({
      next: (response: any) => {
        this.uploadingImage = null;
        if (response?.data) {
          this.systemImages = response.data[0];
          this.rawSystemImages = { ...this.systemImages };
          this.canReset = true;
          this.updateSystemImages();
          this.clearPreview(type);
          this.notificationMessage(`${IMAGE_VALIDATION_RULES[type].label} updated successfully`);
        } else {
          this.clearPreview(type);
          this.notificationMessage(`Failed to update ${IMAGE_VALIDATION_RULES[type].label.toLowerCase()}`);
        }
      },
      error: () => {
        this.uploadingImage = null;
        this.clearPreview(type);
        this.notificationMessage(`Failed to update ${IMAGE_VALIDATION_RULES[type].label.toLowerCase()}`);
      },
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

  private clearPreview(type: ImageType): void {
    if (this.previewImages[type]?.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewImages[type]!);
    }
    delete this.previewImages[type];
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
            this.previewImages = {};
            this.validationErrors = {};
          } else {
            this.notificationMessage("Failed to reset system images")
          }
        },
        error: (error) => {
          this.notificationMessage("Failed to reset system images")
        }
      })
    }
  }

  // Resets just one image back to its default, leaving the other two
  // (custom or otherwise) untouched. Bound to that image's Delete icon.
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
          this.clearPreview(type);
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

  // Downloads whatever is currently showing for that image - the custom
  // upload, or the bundled default if none was uploaded.
  async onDownloadImage(type: ImageType): Promise<void> {
    const url = this.previewImages[type] || this.systemImages?.[type];
    if (!url) {
      return;
    }
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const extension = this.extensionFromUrl(url, blob.type);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${type}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      this.notificationMessage(`Failed to download ${IMAGE_VALIDATION_RULES[type].label.toLowerCase()}`);
    }
  }

  private extensionFromUrl(url: string, mimeType: string): string {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
    if (match) {
      return match[1];
    }
    return mimeType.split('/').pop() || 'png';
  }

  ngOnDestroy() {
    Object.values(this.previewImages).forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

}
