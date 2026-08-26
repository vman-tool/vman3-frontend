import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PcvaComponent } from './pcva.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('PcvaComponent', () => {
  let component: PcvaComponent;
  let fixture: ComponentFixture<PcvaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PcvaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PcvaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
