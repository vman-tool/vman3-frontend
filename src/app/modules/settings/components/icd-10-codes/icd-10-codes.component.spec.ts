import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Icd10CodesComponent } from './icd-10-codes.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('Icd10CodesComponent', () => {
  let component: Icd10CodesComponent;
  let fixture: ComponentFixture<Icd10CodesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Icd10CodesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Icd10CodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
