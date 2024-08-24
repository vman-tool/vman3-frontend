import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeVaComponent } from './code-va.component';

describe('CodeVaComponent', () => {
  let component: CodeVaComponent;
  let fixture: ComponentFixture<CodeVaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeVaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodeVaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
