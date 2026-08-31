import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataCleanerComponent } from './data-cleaner.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('DataCleanerComponent', () => {
  let component: DataCleanerComponent;
  let fixture: ComponentFixture<DataCleanerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataCleanerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataCleanerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
