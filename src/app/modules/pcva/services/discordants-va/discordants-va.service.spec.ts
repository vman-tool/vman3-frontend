import { TestBed } from '@angular/core/testing';

import { DiscordantsVaService } from './discordants-va.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('DiscordantsVaService', () => {
  let service: DiscordantsVaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(DiscordantsVaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
