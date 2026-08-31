import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllAssignedComponent } from './all-assigned.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('AllAssignedComponent', () => {
  let component: AllAssignedComponent;
  let fixture: ComponentFixture<AllAssignedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AllAssignedComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllAssignedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
