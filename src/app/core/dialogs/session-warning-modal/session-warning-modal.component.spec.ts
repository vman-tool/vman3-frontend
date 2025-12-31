import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionWarningModalComponent } from './session-warning-modal.component';

describe('SessionWarningModalComponent', () => {
  let component: SessionWarningModalComponent;
  let fixture: ComponentFixture<SessionWarningModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SessionWarningModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SessionWarningModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
