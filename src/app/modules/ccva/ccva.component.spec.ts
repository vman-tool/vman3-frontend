import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CcvaComponent } from './ccva.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CcvaComponent', () => {
  let component: CcvaComponent;
  let fixture: ComponentFixture<CcvaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CcvaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CcvaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
