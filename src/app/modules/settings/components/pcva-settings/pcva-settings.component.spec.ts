import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PcvaSettingsComponent } from './pcva-settings.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('PcvaSettingsComponent', () => {
  let component: PcvaSettingsComponent;
  let fixture: ComponentFixture<PcvaSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PcvaSettingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PcvaSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
