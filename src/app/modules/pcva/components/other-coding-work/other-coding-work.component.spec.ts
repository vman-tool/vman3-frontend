import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherCodingWorkComponent } from './other-coding-work.component';

describe('OtherCodingWorkComponent', () => {
  let component: OtherCodingWorkComponent;
  let fixture: ComponentFixture<OtherCodingWorkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtherCodingWorkComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OtherCodingWorkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
