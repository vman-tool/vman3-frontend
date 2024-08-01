import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodersComponent } from './coders.component';

describe('CodersComponent', () => {
  let component: CodersComponent;
  let fixture: ComponentFixture<CodersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
