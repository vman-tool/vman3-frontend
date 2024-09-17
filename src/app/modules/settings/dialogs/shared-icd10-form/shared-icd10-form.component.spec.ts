import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedIcd10FormComponent } from './shared-icd10-form.component';

describe('SharedIcd10FormComponent', () => {
  let component: SharedIcd10FormComponent;
  let fixture: ComponentFixture<SharedIcd10FormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SharedIcd10FormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SharedIcd10FormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
