import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeVaComponent } from './code-va.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('CodeVaComponent', () => {
  let component: CodeVaComponent;
  let fixture: ComponentFixture<CodeVaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodeVaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }]
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
