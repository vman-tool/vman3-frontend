import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchableSelectForObjectsComponent } from './searchable-select-for-objects.component';

describe('SearchableSelectForObjectsComponent', () => {
  let component: SearchableSelectForObjectsComponent;
  let fixture: ComponentFixture<SearchableSelectForObjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchableSelectForObjectsComponent]
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
