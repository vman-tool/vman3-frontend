import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddIcd10CategoryTypeComponent } from './add-icd10-category-type.component';

describe('AddIcd10CategoryTypeComponent', () => {
  let component: AddIcd10CategoryTypeComponent;
  let fixture: ComponentFixture<AddIcd10CategoryTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddIcd10CategoryTypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddIcd10CategoryTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
