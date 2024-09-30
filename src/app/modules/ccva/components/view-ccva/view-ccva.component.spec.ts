import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewCcvaComponent } from './view-ccva.component';

describe('ViewCcvaComponent', () => {
  let component: ViewCcvaComponent;
  let fixture: ComponentFixture<ViewCcvaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewCcvaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewCcvaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
