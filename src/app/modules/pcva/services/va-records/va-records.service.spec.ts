import { TestBed } from '@angular/core/testing';

import { VaRecordsService } from './va-records.service';

describe('VaRecordsService', () => {
  let service: VaRecordsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VaRecordsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
