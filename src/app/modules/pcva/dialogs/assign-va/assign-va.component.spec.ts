import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignVaComponent } from './assign-va.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('AssignVaComponent', () => {
  let component: AssignVaComponent;
  let fixture: ComponentFixture<AssignVaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AssignVaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }]
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
