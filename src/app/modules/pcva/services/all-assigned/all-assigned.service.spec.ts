import { TestBed } from '@angular/core/testing';

import { AllAssignedService } from './all-assigned.service';

describe('AllAssignedService', () => {
  let service: AllAssignedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AllAssignedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
