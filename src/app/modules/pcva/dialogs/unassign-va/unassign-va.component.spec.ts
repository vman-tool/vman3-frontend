import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnassignVaComponent } from './unassign-va.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('UnassignVaComponent', () => {
  let component: UnassignVaComponent;
  let fixture: ComponentFixture<UnassignVaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UnassignVaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }]
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
