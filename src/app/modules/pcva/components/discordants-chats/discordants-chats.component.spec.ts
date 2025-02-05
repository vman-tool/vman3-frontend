import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscordantsChatsComponent } from './discordants-chats.component';

describe('DiscordantsChatsComponent', () => {
  let component: DiscordantsChatsComponent;
  let fixture: ComponentFixture<DiscordantsChatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DiscordantsChatsComponent]
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
