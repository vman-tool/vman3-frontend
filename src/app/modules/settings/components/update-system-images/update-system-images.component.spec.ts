import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { UpdateSystemImagesComponent } from './update-system-images.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('UpdateSystemImagesComponent', () => {
  let component: UpdateSystemImagesComponent;
  let fixture: ComponentFixture<UpdateSystemImagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateSystemImagesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateSystemImagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

// Constructed directly, without TestBed/template compilation - the methods
// under test here are plain component-class logic.
describe('UpdateSystemImagesComponent (unit)', () => {
  // jsdom has no createObjectURL, and doesn't actually decode images loaded
  // via `new Image()` - both are mocked so validateImageFile's async decode
  // path is deterministic instead of hanging or throwing.
  let imageInstances: MockImage[] = [];

  class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 0;
    naturalHeight = 0;
    private _src = '';
    set src(value: string) {
      this._src = value;
      imageInstances.push(this);
    }
    get src() {
      return this._src;
    }
  }

  beforeEach(() => {
    imageInstances = [];
    (globalThis as any).Image = MockImage;
    (URL as any).createObjectURL = jest.fn(() => 'blob:fake-url');
    (URL as any).revokeObjectURL = jest.fn();
  });

  function resolveLastImageAsDecodable(width: number, height: number) {
    const image = imageInstances[imageInstances.length - 1];
    image.naturalWidth = width;
    image.naturalHeight = height;
    image.onload?.();
  }

  function resolveLastImageAsCorrupted() {
    imageInstances[imageInstances.length - 1].onerror?.();
  }

  function makeComponent() {
    const configService = { BASE_URL: 'http://backend' } as any;
    const settingConfigService = {
      getSystemImages: jest.fn().mockReturnValue(of({ data: [{}] })),
      saveSystemImages: jest.fn().mockReturnValue(of({ data: [{}] })),
      resetImages: jest.fn().mockReturnValue(of({ data: [{}] })),
      resetSingleImage: jest.fn().mockReturnValue(of({ data: [{}] })),
    } as any;
    const snackBar = { open: jest.fn() } as any;

    const component = new UpdateSystemImagesComponent(snackBar, configService, settingConfigService);
    return { component, configService, settingConfigService, snackBar };
  }

  function makeFile(name: string, sizeBytes: number, type = 'image/png'): File {
    return new File([new Uint8Array(sizeBytes)], name, { type });
  }

  function selectFile(component: UpdateSystemImagesComponent, file: File, type: 'favicon' | 'logo' | 'home_image') {
    const input = { files: [file], value: 'x' };
    component.onFileSelected({ target: input }, type);
    return input;
  }

  describe('loadSystemImages', () => {
    it('bypasses the cache so this admin screen never shows a stale snapshot', () => {
      const { component, settingConfigService } = makeComponent();
      component.loadSystemImages();
      expect(settingConfigService.getSystemImages).toHaveBeenCalledWith(false);
    });

    it('falls back to bundled default asset paths when nothing is uploaded', () => {
      const { component, settingConfigService } = makeComponent();
      settingConfigService.getSystemImages.mockReturnValue(of({ data: [{ favicon: null, logo: null, home_image: null }] }));

      component.loadSystemImages();

      expect(component.systemImages?.favicon).toContain('favicon.ico');
      expect(component.canReset).toBe(false);
      expect(component.hasCustomImage('favicon')).toBe(false);
    });

    it('prefixes an uploaded image path with BASE_URL and enables that image’s reset button', () => {
      const { component, settingConfigService } = makeComponent();
      settingConfigService.getSystemImages.mockReturnValue(
        of({ data: [{ favicon: '/uploads/fav.ico', logo: null, home_image: null }] })
      );

      component.loadSystemImages();

      expect(component.systemImages?.favicon).toBe('http://backend/uploads/fav.ico');
      expect(component.hasCustomImage('favicon')).toBe(true);
      expect(component.hasCustomImage('logo')).toBe(false);
      // canReset is a pre-existing `(a && a) || (b && b) || ...` expression -
      // truthy, but not necessarily a strict boolean.
      expect(component.canReset).toBeTruthy();
    });
  });

  describe('onFileSelected validation', () => {
    it('rejects an unsupported extension without touching the preview', async () => {
      const { component, snackBar } = makeComponent();
      const file = makeFile('malware.exe', 100);

      selectFile(component, file, 'logo');
      await Promise.resolve();

      expect(component.validationErrors.logo).toContain('unsupported file type');
      expect(component.previewImages.logo).toBeUndefined();
      expect(snackBar.open).toHaveBeenCalled();
    });

    it('rejects a favicon over its 512KB limit', async () => {
      const { component } = makeComponent();
      const file = makeFile('big.png', 600 * 1024);

      selectFile(component, file, 'favicon');
      await Promise.resolve();

      expect(component.validationErrors.favicon).toContain('too large');
    });

    it('accepts a logo up to its 5MB limit', async () => {
      const { component } = makeComponent();
      const file = makeFile('logo.png', 4 * 1024 * 1024);

      selectFile(component, file, 'logo');
      resolveLastImageAsDecodable(200, 200);
      await Promise.resolve();

      expect(component.validationErrors.logo).toBeUndefined();
    });

    it('rejects a corrupted file that fails to decode', async () => {
      const { component, snackBar } = makeComponent();
      const file = makeFile('corrupt.png', 100);

      selectFile(component, file, 'logo');
      resolveLastImageAsCorrupted();
      await Promise.resolve();

      expect(component.validationErrors.logo).toContain('could not be read');
      expect(snackBar.open).toHaveBeenCalled();
    });

    it('rejects an image smaller than the minimum dimensions for that type', async () => {
      const { component } = makeComponent();
      const file = makeFile('tiny.png', 100);

      selectFile(component, file, 'home_image');
      resolveLastImageAsDecodable(50, 50); // home_image requires >= 200x200
      await Promise.resolve();

      expect(component.validationErrors.home_image).toContain('too small');
    });

    it('skips the dimension check for SVG', async () => {
      const { component } = makeComponent();
      const file = makeFile('icon.svg', 100, 'image/svg+xml');

      selectFile(component, file, 'favicon');
      resolveLastImageAsDecodable(1, 1); // would fail the 16x16 floor for a raster image
      await Promise.resolve();

      expect(component.validationErrors.favicon).toBeUndefined();
    });

    it('accepts a valid image and sets the preview via FileReader', async () => {
      const { component } = makeComponent();
      const file = makeFile('logo.png', 1024);

      const input = selectFile(component, file, 'logo');
      resolveLastImageAsDecodable(100, 100);
      // Flush the validation promise and jsdom's FileReader (async).
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(component.validationErrors.logo).toBeUndefined();
      expect(component.logo).toBe(file);
      expect(component.previewImages.logo).toEqual(expect.stringContaining('data:'));
      expect(input.value).toBe('x'); // untouched on success
    });
  });

  describe('onResetSingleImage', () => {
    it('does nothing when the image has no custom value to reset', () => {
      const { component, settingConfigService } = makeComponent();
      component['rawSystemImages'] = { favicon: undefined };

      component.onResetSingleImage('favicon');

      expect(settingConfigService.resetSingleImage).not.toHaveBeenCalled();
    });

    it('resets only the named image, leaving hasCustomImage for the others as-is', () => {
      const { component, settingConfigService } = makeComponent();
      component['rawSystemImages'] = { favicon: '/uploads/fav.ico', logo: '/uploads/logo.png' };
      settingConfigService.resetSingleImage.mockReturnValue(
        of({ data: [{ favicon: null, logo: '/uploads/logo.png', home_image: null }] })
      );

      component.onResetSingleImage('favicon');

      expect(settingConfigService.resetSingleImage).toHaveBeenCalledWith('favicon');
      expect(component.hasCustomImage('favicon')).toBe(false);
      expect(component.hasCustomImage('logo')).toBe(true);
      expect(component.resettingImage).toBeNull();
    });
  });

  describe('onSaveImages', () => {
    it('refuses to save while any image has a pending validation error', () => {
      const { component, settingConfigService } = makeComponent();
      component.validationErrors.logo = 'too large';
      component.previewImages.logo = 'data:image/png;base64,x';

      component.onSaveImages({ stopPropagation: jest.fn() });

      expect(settingConfigService.saveSystemImages).not.toHaveBeenCalled();
    });

    it('saves and marks every image as reset-able afterward', () => {
      const { component, settingConfigService } = makeComponent();
      component.previewImages.logo = 'data:image/png;base64,x';
      component.logo = makeFile('logo.png', 100);
      settingConfigService.saveSystemImages.mockReturnValue(
        of({ data: [{ favicon: null, logo: '/uploads/logo.png', home_image: null }] })
      );

      component.onSaveImages({ stopPropagation: jest.fn() });

      expect(settingConfigService.saveSystemImages).toHaveBeenCalled();
      expect(component.canReset).toBe(true);
      expect(component.previewImages).toEqual({});
    });
  });
});
