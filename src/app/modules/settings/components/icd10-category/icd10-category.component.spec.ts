import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Icd10CategoryComponent } from './icd10-category.component';

describe('Icd10CategoryComponent', () => {
  let component: Icd10CategoryComponent;
  let fixture: ComponentFixture<Icd10CategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Icd10CategoryComponent]
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
