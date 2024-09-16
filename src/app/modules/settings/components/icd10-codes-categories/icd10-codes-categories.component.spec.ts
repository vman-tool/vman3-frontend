import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Icd10CodesCategoriesComponent } from './icd10-codes-categories.component';

describe('Icd10CodesCategoriesComponent', () => {
  let component: Icd10CodesCategoriesComponent;
  let fixture: ComponentFixture<Icd10CodesCategoriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Icd10CodesCategoriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Icd10CodesCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
