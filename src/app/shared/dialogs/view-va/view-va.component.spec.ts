import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewVaComponent } from './view-va.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('ViewVaComponent', () => {
  let component: ViewVaComponent;
  let fixture: ComponentFixture<ViewVaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewVaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }]
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
