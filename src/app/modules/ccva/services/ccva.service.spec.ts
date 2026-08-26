import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CcvaService } from './ccva.service';
import { ConfigService } from '../../../app.service';

const API_URL = 'http://test-api/vman/api/v1';

describe('CcvaService', () => {
  let service: CcvaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: { API_URL } },
      ],
    });
    service = TestBed.inject(CcvaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('get_list__ccva_Results', () => {
    it('GETs the list endpoint', () => {
      service.get_list__ccva_Results().subscribe();

      const req = httpMock.expectOne(`${API_URL}/ccva/list`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: [] });
    });
  });

  describe('set_default_ccva', () => {
    it('POSTs to the set-default endpoint for the given id with an empty body', () => {
      service.set_default_ccva('56007').subscribe();

      const req = httpMock.expectOne(`${API_URL}/ccva/56007/set-default`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ message: 'ok' });
    });
  });

  describe('clear_default_ccva', () => {
    it('POSTs to the clear-default endpoint for the given id', () => {
      service.clear_default_ccva('56007').subscribe();

      const req = httpMock.expectOne(`${API_URL}/ccva/56007/clear-default`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ message: 'ok' });
    });
  });

  describe('delete_ccva', () => {
    it('DELETEs the entry by id', () => {
      service.delete_ccva('56007').subscribe();

      const req = httpMock.expectOne(`${API_URL}/ccva/56007`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('get_ccva_Results', () => {
    it('hits the base ccva endpoint with no id in the path when none is given', () => {
      service.get_ccva_Results().subscribe();

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/ccva`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: [] });
    });

    it('puts the id in the query string as ccva_id when one is given', () => {
      service.get_ccva_Results('56007').subscribe();

      // ccva_id is embedded directly in the request URL's query string by
      // this service (not via HttpParams), so match on the raw URL.
      const req = httpMock.expectOne((r) => r.urlWithParams.includes('ccva_id=56007'));
      req.flush({ data: [] });
    });

    it('includes only the params that were actually passed', () => {
      service.get_ccva_Results(undefined, 'concordant', '2026-01-01', '2026-02-01').subscribe();

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/ccva`);
      expect(req.request.params.get('selected_success_type')).toBe('concordant');
      expect(req.request.params.get('start_date')).toBe('2026-01-01');
      expect(req.request.params.get('end_date')).toBe('2026-02-01');
      expect(req.request.params.get('date_type')).toBeNull();
      req.flush({ data: [] });
    });

    it('serializes locations as a JSON array of {field, value} pairs', () => {
      service
        .get_ccva_Results(undefined, null, undefined, undefined, [
          { field: 'region', field_label: 'Region', label: 'North', value: 'north' },
        ])
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/ccva`);
      expect(JSON.parse(req.request.params.get('locations')!)).toEqual([
        { field: 'region', value: 'north' },
      ]);
      req.flush({ data: [] });
    });
  });
});
