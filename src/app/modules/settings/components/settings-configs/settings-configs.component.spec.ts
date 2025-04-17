import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsConfigsComponent } from './settings-configs.component';

describe('SettingsConfigsComponent', () => {
  let component: SettingsConfigsComponent;
  let fixture: ComponentFixture<SettingsConfigsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsConfigsComponent]
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
