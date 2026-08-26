import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Icd10CodesListComponent } from './icd10-codes-list.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('Icd10CodesListComponent', () => {
  let component: Icd10CodesListComponent;
  let fixture: ComponentFixture<Icd10CodesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Icd10CodesListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Icd10CodesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
