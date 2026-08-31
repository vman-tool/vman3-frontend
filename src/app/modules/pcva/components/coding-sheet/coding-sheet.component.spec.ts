import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatExpansionModule } from '@angular/material/expansion';
import { SearchableMultiSelectComponent } from 'app/shared/components/searchable-multi-select/searchable-multi-select.component';
import { CodingSheetComponent } from './coding-sheet.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CodingSheetComponent', () => {
  let component: CodingSheetComponent;
  let fixture: ComponentFixture<CodingSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodingSheetComponent],
      imports: [MatExpansionModule, SearchableMultiSelectComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodingSheetComponent);
    component = fixture.componentInstance;
    // ngOnInit indexes into this @Input() with no undefined guard.
    component.vaRecord = {};
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
