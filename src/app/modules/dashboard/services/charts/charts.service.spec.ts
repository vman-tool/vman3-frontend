import { TestBed } from '@angular/core/testing';

import { ChartsService } from './charts.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('ChartsService', () => {
  let service: ChartsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ChartsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
