import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CcvaPublicComponent } from './ccva-public.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CcvaPublicComponent', () => {
  let component: CcvaPublicComponent;
  let fixture: ComponentFixture<CcvaPublicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CcvaPublicComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CcvaPublicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
