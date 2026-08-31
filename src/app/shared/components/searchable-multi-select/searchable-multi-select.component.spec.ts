import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchableMultiSelectComponent } from './searchable-multi-select.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('SearchableMultiSelectComponent', () => {
  let component: SearchableMultiSelectComponent;
  let fixture: ComponentFixture<SearchableMultiSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchableMultiSelectComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchableMultiSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
