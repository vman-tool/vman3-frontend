import { TestBed } from '@angular/core/testing';

import { RunCcvaService } from './run-ccva.service';

describe('RunCcvaService', () => {
  let service: RunCcvaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RunCcvaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
