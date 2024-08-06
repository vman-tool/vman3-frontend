import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VaFiltersComponent } from './va-filters.component';

describe('VaFiltersComponent', () => {
  let component: VaFiltersComponent;
  let fixture: ComponentFixture<VaFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaFiltersComponent]
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
