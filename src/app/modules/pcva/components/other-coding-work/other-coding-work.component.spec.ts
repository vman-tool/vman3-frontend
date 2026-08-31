import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherCodingWorkComponent } from './other-coding-work.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('OtherCodingWorkComponent', () => {
  let component: OtherCodingWorkComponent;
  let fixture: ComponentFixture<OtherCodingWorkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtherCodingWorkComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OtherCodingWorkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
