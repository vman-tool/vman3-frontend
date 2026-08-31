import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataQualityComponent } from './data-quality.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CcvaComponent', () => {
  let component: DataQualityComponent;
  let fixture: ComponentFixture<DataQualityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataQualityComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataQualityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
