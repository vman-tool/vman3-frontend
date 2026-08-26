import { TestBed } from '@angular/core/testing';

import { UserActivityService } from './user-activity.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('UserActivityService', () => {
  let service: UserActivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UserActivityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
