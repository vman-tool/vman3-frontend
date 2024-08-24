import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsConfigsFormComponent } from './settings-configs-form.component';

describe('SettingsConfigsFormComponent', () => {
  let component: SettingsConfigsFormComponent;
  let fixture: ComponentFixture<SettingsConfigsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsConfigsFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsConfigsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
