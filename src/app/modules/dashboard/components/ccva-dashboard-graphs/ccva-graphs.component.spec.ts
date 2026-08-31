import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CcvaDashboardGraphsComponent } from './ccva-graphs.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CcvaDashboardGraphsComponent', () => {
  let component: CcvaDashboardGraphsComponent;
  let fixture: ComponentFixture<CcvaDashboardGraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CcvaDashboardGraphsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CcvaDashboardGraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
