import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscordantsChatsComponent } from './discordants-chats.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('DiscordantsChatsComponent', () => {
  let component: DiscordantsChatsComponent;
  let fixture: ComponentFixture<DiscordantsChatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DiscordantsChatsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscordantsChatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
