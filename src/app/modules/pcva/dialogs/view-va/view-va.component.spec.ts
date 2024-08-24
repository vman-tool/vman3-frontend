import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewVaComponent } from './view-va.component';

describe('ViewVaComponent', () => {
  let component: ViewVaComponent;
  let fixture: ComponentFixture<ViewVaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewVaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewVaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
