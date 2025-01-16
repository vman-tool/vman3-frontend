import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodingSheetComponent } from './coding-sheet.component';

describe('CodingSheetComponent', () => {
  let component: CodingSheetComponent;
  let fixture: ComponentFixture<CodingSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodingSheetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodingSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
