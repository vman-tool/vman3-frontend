import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedConfirmationComponent } from './shared-confirmation.component';

describe('SharedConfirmationComponent', () => {
  let component: SharedConfirmationComponent;
  let fixture: ComponentFixture<SharedConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SharedConfirmationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SharedConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
