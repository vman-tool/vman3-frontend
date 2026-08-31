import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Icd10CategoryComponent } from './icd10-category.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('Icd10CategoryComponent', () => {
  let component: Icd10CategoryComponent;
  let fixture: ComponentFixture<Icd10CategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Icd10CategoryComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Icd10CategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
