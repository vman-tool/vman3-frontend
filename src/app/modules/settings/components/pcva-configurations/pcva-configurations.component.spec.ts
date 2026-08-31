import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PcvaConfigurationsComponent } from './pcva-configurations.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('PcvaConfigurationsComponent', () => {
  let component: PcvaConfigurationsComponent;
  let fixture: ComponentFixture<PcvaConfigurationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PcvaConfigurationsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PcvaConfigurationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
