import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunCcvaComponent } from './run-ccva.component';

describe('RunCcvaComponent', () => {
  let component: RunCcvaComponent;
  let fixture: ComponentFixture<RunCcvaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RunCcvaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RunCcvaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
