import { TestBed } from '@angular/core/testing';

import { RunCcvaService } from './run-ccva.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('RunCcvaService', () => {
  let service: RunCcvaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(RunCcvaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
