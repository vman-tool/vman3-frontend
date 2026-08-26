import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PcvaResultsComponent } from './pcva-results.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('PcvaResultsComponent', () => {
  let component: PcvaResultsComponent;
  let fixture: ComponentFixture<PcvaResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PcvaResultsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PcvaResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
