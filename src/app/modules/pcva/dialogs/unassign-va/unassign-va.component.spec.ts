import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnassignVaComponent } from './unassign-va.component';

describe('UnassignVaComponent', () => {
  let component: UnassignVaComponent;
  let fixture: ComponentFixture<UnassignVaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UnassignVaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnassignVaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
