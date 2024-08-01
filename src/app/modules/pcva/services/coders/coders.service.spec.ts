import { TestBed } from '@angular/core/testing';

import { CodersService } from './coders.service';

describe('CodersService', () => {
  let service: CodersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CodersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
