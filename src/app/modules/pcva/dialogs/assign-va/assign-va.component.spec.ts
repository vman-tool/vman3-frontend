import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignVaComponent } from './assign-va.component';

describe('AssignVaComponent', () => {
  let component: AssignVaComponent;
  let fixture: ComponentFixture<AssignVaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignVaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignVaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
