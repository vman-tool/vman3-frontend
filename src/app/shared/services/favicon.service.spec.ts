import { TestBed } from '@angular/core/testing';
import { FaviconService } from './favicon.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';


describe('FaviconService', () => {
  let service: FaviconService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(FaviconService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

describe('FaviconService (unit)', () => {
  afterEach(() => {
    document.head.querySelector('#app-favicon')?.remove();
  });

  it('creates the favicon <link> tag on first use and sets its href', () => {
    const service = new FaviconService('browser');

    service.changeFavicon('https://example.com/icon.ico');

    const link = document.head.querySelector<HTMLLinkElement>('#app-favicon');
    expect(link).not.toBeNull();
    expect(link!.rel).toBe('icon');
    expect(link!.href).toBe('https://example.com/icon.ico');
  });

  it('reuses the existing tag on a later call instead of creating a duplicate', () => {
    const service = new FaviconService('browser');

    service.changeFavicon('https://example.com/first.ico');
    service.changeFavicon('https://example.com/second.ico');

    expect(document.head.querySelectorAll('#app-favicon')).toHaveLength(1);
    expect(document.head.querySelector<HTMLLinkElement>('#app-favicon')!.href).toBe(
      'https://example.com/second.ico'
    );
  });

  it('does nothing on the server platform', () => {
    const service = new FaviconService('server');

    service.changeFavicon('https://example.com/icon.ico');

    expect(document.head.querySelector('#app-favicon')).toBeNull();
  });
});
