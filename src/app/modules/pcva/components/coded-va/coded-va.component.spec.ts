import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodedVaComponent } from './coded-va.component';

describe('CodedVaComponent', () => {
  let component: CodedVaComponent;
  let fixture: ComponentFixture<CodedVaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodedVaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodedVaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
