import { TestBed } from '@angular/core/testing';

import { CodedVaService } from './coded-va.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CodedVaService', () => {
  let service: CodedVaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CodedVaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
