import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Icd10CodesListComponent } from './icd10-codes-list.component';

describe('Icd10CodesListComponent', () => {
  let component: Icd10CodesListComponent;
  let fixture: ComponentFixture<Icd10CodesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Icd10CodesListComponent]
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
