import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodedVaComponent } from './coded-va.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CodedVaComponent', () => {
  let component: CodedVaComponent;
  let fixture: ComponentFixture<CodedVaComponent>;

  beforeEach(async () => {
    // The component reads and JSON.parses 'current_user' from localStorage
    // on init - it's always set by login in real usage, but jsdom starts
    // with an empty localStorage.
    localStorage.setItem('current_user', JSON.stringify({ uuid: 'test-user' }));

    await TestBed.configureTestingModule({
      declarations: [CodedVaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodedVaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
