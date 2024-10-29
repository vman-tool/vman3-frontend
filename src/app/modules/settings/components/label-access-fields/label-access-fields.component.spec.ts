import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelAccessFieldsComponent } from './label-access-fields.component';

describe('LabelAccessFieldsComponent', () => {
  let component: LabelAccessFieldsComponent;
  let fixture: ComponentFixture<LabelAccessFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LabelAccessFieldsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LabelAccessFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
