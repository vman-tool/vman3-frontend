import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscordantsVaComponent } from './discordants-va.component';

describe('DiscordantsVaComponent', () => {
  let component: DiscordantsVaComponent;
  let fixture: ComponentFixture<DiscordantsVaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DiscordantsVaComponent]
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
