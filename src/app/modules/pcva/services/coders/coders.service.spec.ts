import { TestBed } from '@angular/core/testing';

import { CodersService } from './coders.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CodersService', () => {
  let service: CodersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CodersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
