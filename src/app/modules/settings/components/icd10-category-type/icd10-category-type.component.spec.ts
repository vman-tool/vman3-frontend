import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Icd10CategoryTypeComponent } from './icd10-category-type.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('Icd10CategoryTypeComponent', () => {
  let component: Icd10CategoryTypeComponent;
  let fixture: ComponentFixture<Icd10CategoryTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Icd10CategoryTypeComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Icd10CategoryTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
