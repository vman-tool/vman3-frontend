import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchableSelectForObjectsComponent } from './searchable-select-for-objects.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('SearchableSelectForObjectsComponent', () => {
  let component: SearchableSelectForObjectsComponent;
  let fixture: ComponentFixture<SearchableSelectForObjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchableSelectForObjectsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchableSelectForObjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
