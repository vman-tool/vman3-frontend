import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PcvaSettingsComponent } from './pcva-settings.component';

describe('PcvaSettingsComponent', () => {
  let component: PcvaSettingsComponent;
  let fixture: ComponentFixture<PcvaSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PcvaSettingsComponent]
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
