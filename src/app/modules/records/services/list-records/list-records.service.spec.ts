import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ListRecordsService } from './list-records.service';
import { ConfigService } from 'app/app.service';

const API_URL = 'http://test-api/vman/api/v1';

describe('ListRecordsService', () => {
  let service: ListRecordsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: { API_URL } },
      ],
    });
    service = TestBed.inject(ListRecordsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getRecordsData', () => {
    it('omits sort/filter params by default', () => {
      service.getRecordsData(1, 10).subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/records`);
      expect(req.request.params.has('sort_by')).toBe(false);
      expect(req.request.params.has('filter_by')).toBe(false);
      req.flush({ data: [], total: 0 });
    });

    it('sends sort_by/sort_dir when sorting a CCVA column', () => {
      service.getRecordsData(1, 10, undefined, undefined, undefined, undefined, undefined, 'ccvaCauseBroad', 'desc').subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/records`);
      expect(req.request.params.get('sort_by')).toBe('ccvaCauseBroad');
      expect(req.request.params.get('sort_dir')).toBe('desc');
      req.flush({ data: [], total: 0 });
    });

    it('sends filter_by/filter_value only when both are given', () => {
      service.getRecordsData(
        1, 10, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        'ccvaAlgorithm', 'VManML10'
      ).subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/records`);
      expect(req.request.params.get('filter_by')).toBe('ccvaAlgorithm');
      expect(req.request.params.get('filter_value')).toBe('VManML10');
      req.flush({ data: [], total: 0 });
    });

    it('omits the filter params when filter_value is missing', () => {
      service.getRecordsData(
        1, 10, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'ccvaAlgorithm'
      ).subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/records`);
      expect(req.request.params.has('filter_by')).toBe(false);
      req.flush({ data: [], total: 0 });
    });
  });

  describe('getCcvaFilterOptions', () => {
    it('GETs the ccva-filter-options endpoint', () => {
      service.getCcvaFilterOptions().subscribe();

      const req = httpMock.expectOne(`${API_URL}/records/ccva-filter-options`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: { broad: [], major: [], algorithm: [] } });
    });

    it('falls back to empty option lists on error rather than erroring the caller', done => {
      service.getCcvaFilterOptions().subscribe(response => {
        expect(response).toEqual({ data: { broad: [], major: [], algorithm: [] } });
        done();
      });

      const req = httpMock.expectOne(`${API_URL}/records/ccva-filter-options`);
      req.flush('error', { status: 500, statusText: 'Server Error' });
    });
  });
});
