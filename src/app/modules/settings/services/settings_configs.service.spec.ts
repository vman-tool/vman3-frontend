import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SettingConfigService } from './settings_configs.service';
import { ConfigService } from '../../../app.service';

const API_URL = 'http://test-api/vman/api/v1';

describe('SettingConfigService - system images', () => {
  let service: SettingConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: { API_URL } },
      ],
    });
    service = TestBed.inject(SettingConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function primeCache() {
    service.getSystemImages().subscribe();
    httpMock.expectOne(`${API_URL}/settings/system_images/`).flush({ data: [{ favicon: '/uploads/old.ico' }] });
  }

  describe('getSystemImages caching', () => {
    it('serves a second call from cache instead of issuing a new request', () => {
      primeCache();

      service.getSystemImages().subscribe();

      httpMock.expectNone(`${API_URL}/settings/system_images/`);
    });

    it('bypasses the cache when called with cached=false', () => {
      primeCache();

      service.getSystemImages(false).subscribe();

      httpMock.expectOne(`${API_URL}/settings/system_images/`).flush({ data: [{}] });
    });
  });

  describe('cache invalidation on mutation', () => {
    // Regression: uploading a new image (e.g. the login image) saved
    // correctly, but logging out and back in still showed the old one -
    // this service's 5-minute in-memory cache was never invalidated after
    // a save, and logout is a client-side route change (not a page
    // reload), so this singleton's cache survived it.
    it('saveSystemImages clears the cache, so the next getSystemImages call re-fetches', () => {
      primeCache();

      service.saveSystemImages({ logo: new Blob() as any }).subscribe();
      httpMock.expectOne(`${API_URL}/settings/system_images/`).flush({ data: [{ favicon: '/uploads/new.ico' }] });

      service.getSystemImages().subscribe();
      httpMock.expectOne(`${API_URL}/settings/system_images/`).flush({ data: [{ favicon: '/uploads/new.ico' }] });
    });

    it('resetImages clears the cache', () => {
      primeCache();

      service.resetImages().subscribe();
      httpMock.expectOne(`${API_URL}/settings/system_images/`).flush({ data: [{}] });

      service.getSystemImages().subscribe();
      httpMock.expectOne(`${API_URL}/settings/system_images/`).flush({ data: [{}] });
    });

    it('resetSingleImage clears the cache', () => {
      primeCache();

      service.resetSingleImage('favicon').subscribe();
      httpMock.expectOne(`${API_URL}/settings/system_images/favicon`).flush({ data: [{}] });

      service.getSystemImages().subscribe();
      httpMock.expectOne(`${API_URL}/settings/system_images/`).flush({ data: [{}] });
    });
  });

  describe('saveSystemImages', () => {
    it('appends home_image under the "login_image" form field the backend expects', () => {
      service.saveSystemImages({ home_image: new Blob(['x']) as any }).subscribe();

      const req = httpMock.expectOne(`${API_URL}/settings/system_images/`);
      expect(req.request.method).toBe('POST');
      expect((req.request.body as FormData).has('login_image')).toBe(true);
      expect((req.request.body as FormData).has('logo')).toBe(false);
      req.flush({ data: [{}] });
    });
  });

  describe('resetSingleImage', () => {
    it('DELETEs the endpoint for the given image type', () => {
      service.resetSingleImage('logo').subscribe();

      const req = httpMock.expectOne(`${API_URL}/settings/system_images/logo`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ data: [{}] });
    });
  });
});
