import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddIcd10CodesComponent } from './add-icd10-codes.component';

describe('AddIcd10CodesComponent', () => {
  let component: AddIcd10CodesComponent;
  let fixture: ComponentFixture<AddIcd10CodesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddIcd10CodesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddIcd10CodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
