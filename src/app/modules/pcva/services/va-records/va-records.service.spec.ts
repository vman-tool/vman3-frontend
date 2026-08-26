import { TestBed } from '@angular/core/testing';

import { VaRecordsService } from './va-records.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('VaRecordsService', () => {
  let service: VaRecordsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(VaRecordsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
