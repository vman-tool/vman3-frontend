import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsConfigsComponent } from './settings-configs.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('SettingsConfigsComponent', () => {
  let component: SettingsConfigsComponent;
  let fixture: ComponentFixture<SettingsConfigsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SettingsConfigsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsConfigsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
