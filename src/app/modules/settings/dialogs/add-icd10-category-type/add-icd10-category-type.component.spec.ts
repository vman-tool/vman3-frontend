import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddIcd10CategoryTypeComponent } from './add-icd10-category-type.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('AddIcd10CategoryTypeComponent', () => {
  let component: AddIcd10CategoryTypeComponent;
  let fixture: ComponentFixture<AddIcd10CategoryTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddIcd10CategoryTypeComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }]
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
