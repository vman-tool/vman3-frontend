import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunCcvaComponent } from './run-ccva.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('RunCcvaComponent', () => {
  let component: RunCcvaComponent;
  let fixture: ComponentFixture<RunCcvaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RunCcvaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RunCcvaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
