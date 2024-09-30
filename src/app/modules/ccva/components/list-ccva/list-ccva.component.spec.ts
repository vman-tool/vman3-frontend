import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListCcvaComponent } from './list-ccva.component';

describe('ListCcvaComponent', () => {
  let component: ListCcvaComponent;
  let fixture: ComponentFixture<ListCcvaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListCcvaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListCcvaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
