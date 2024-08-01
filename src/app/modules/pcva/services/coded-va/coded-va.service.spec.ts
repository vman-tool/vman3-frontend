import { TestBed } from '@angular/core/testing';

import { CodedVaService } from './coded-va.service';

describe('CodedVaService', () => {
  let service: CodedVaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CodedVaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
