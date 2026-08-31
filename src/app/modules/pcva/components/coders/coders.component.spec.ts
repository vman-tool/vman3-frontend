import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodersComponent } from './coders.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CodersComponent', () => {
  let component: CodersComponent;
  let fixture: ComponentFixture<CodersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
