import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DataSyncSettingsService, DayOfWeek } from './data_sync_settings.service';
import { ConfigService } from '../../../app.service';

const API_URL = 'http://test-api/vman/api/v1';

describe('DataSyncSettingsService', () => {
  let service: DataSyncSettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: { API_URL } },
      ],
    });
    service = TestBed.inject(DataSyncSettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const days: DayOfWeek[] = [
    { name: 'Monday', value: 'monday', checked: true },
    { name: 'Tuesday', value: 'tuesday', checked: false },
  ];

  describe('saveCronSettings', () => {
    it('sends only the checked days and the selected time', () => {
      service.saveCronSettings(days, '09:00').subscribe();

      const req = httpMock.expectOne(`${API_URL}/settings/cron`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ days: ['monday'], time: '09:00' });
      req.flush({ data: {}, message: 'ok' });
    });

    // Regression: this used to swallow every failure into a fake success
    // (of({})) via handleError, same as this service's other save/get
    // methods - meaning a save the backend actively rejected (e.g. "ODK
    // API is not configured") still showed the caller a successful
    // response. This is the one method where a caller genuinely needs to
    // react to failure, since the backend can reject the save outright.
    it('propagates a server error to the caller instead of masking it as a success', (done) => {
      service.saveCronSettings(days, '09:00').subscribe({
        next: () => done.fail('expected an error, got a success emission'),
        error: (err) => {
          expect(err.status).toBe(400);
          expect(err.error.detail).toBe('ODK API is not configured.');
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/settings/cron`);
      req.flush({ detail: 'ODK API is not configured.' }, { status: 400, statusText: 'Bad Request' });
    });
  });
});
