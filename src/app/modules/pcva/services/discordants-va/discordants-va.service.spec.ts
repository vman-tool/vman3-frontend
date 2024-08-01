import { TestBed } from '@angular/core/testing';

import { DiscordantsVaService } from './discordants-va.service';

describe('DiscordantsVaService', () => {
  let service: DiscordantsVaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiscordantsVaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
