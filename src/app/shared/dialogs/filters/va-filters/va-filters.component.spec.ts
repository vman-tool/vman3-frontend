import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VaFiltersComponent } from './va-filters.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('VaFiltersComponent', () => {
  let component: VaFiltersComponent;
  let fixture: ComponentFixture<VaFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaFiltersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VaFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
