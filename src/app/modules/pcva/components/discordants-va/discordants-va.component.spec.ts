import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscordantsVaComponent } from './discordants-va.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('DiscordantsVaComponent', () => {
  let component: DiscordantsVaComponent;
  let fixture: ComponentFixture<DiscordantsVaComponent>;

  beforeEach(async () => {
    // The component reads and JSON.parses 'current_user' from localStorage
    // on init - it's always set by login in real usage, but jsdom starts
    // with an empty localStorage.
    localStorage.setItem('current_user', JSON.stringify({ uuid: 'test-user' }));

    await TestBed.configureTestingModule({
      declarations: [DiscordantsVaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscordantsVaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
