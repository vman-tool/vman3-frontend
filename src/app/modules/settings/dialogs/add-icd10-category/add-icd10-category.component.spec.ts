import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddIcd10CategoryComponent } from './add-icd10-category.component';

describe('AddIcd10CategoryComponent', () => {
  let component: AddIcd10CategoryComponent;
  let fixture: ComponentFixture<AddIcd10CategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddIcd10CategoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddIcd10CategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
