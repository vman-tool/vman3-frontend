import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataCheckComponent } from './data-check.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('DataCheckComponent', () => {
  let component: DataCheckComponent;
  let fixture: ComponentFixture<DataCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataCheckComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
