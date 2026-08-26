import { TestBed } from '@angular/core/testing';

import { AllAssignedService } from './all-assigned.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('AllAssignedService', () => {
  let service: AllAssignedService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AllAssignedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
