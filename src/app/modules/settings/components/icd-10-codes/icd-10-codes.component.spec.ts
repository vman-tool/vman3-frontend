import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Icd10CodesComponent } from './icd-10-codes.component';

describe('Icd10CodesComponent', () => {
  let component: Icd10CodesComponent;
  let fixture: ComponentFixture<Icd10CodesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Icd10CodesComponent]
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
