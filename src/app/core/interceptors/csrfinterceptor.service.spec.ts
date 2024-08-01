import { TestBed } from '@angular/core/testing';

import { CsrfinterceptorService } from './csrfinterceptor.service';

describe('CsrfinterceptorService', () => {
  let service: CsrfinterceptorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CsrfinterceptorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
