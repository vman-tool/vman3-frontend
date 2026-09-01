import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

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

// Constructed directly, without TestBed/template compilation - the methods
// under test here are plain component-class logic.
describe('SettingsConfigsComponent (unit)', () => {
  function makeComponent() {
    const settingsService = {
      getSyncSettings: jest.fn().mockReturnValue(of({
        cron_settings: { days: [], time: '00:00' },
        backup_settings: { frequency: 'daily', time: '00:00', location: 'local' },
      })),
      getServerTime: jest.fn().mockReturnValue(of({ epoch_ms: Date.now() })),
      saveCronSettings: jest.fn().mockReturnValue(of({})),
      saveBackupSettings: jest.fn().mockReturnValue(of({})),
    } as any;

    const snackBar = { open: jest.fn() } as any;
    const component = new SettingsConfigsComponent(settingsService, snackBar);
    return { component, settingsService, snackBar };
  }

  describe('isScheduleConfigured', () => {
    // Regression: the "Idle"/"Active" badge used to only ever reflect
    // whether a sync was running *right now* - there was no way to tell,
    // from this screen, whether a schedule was even configured at all.
    it('is false when no day is selected - matches the backend gate that skips scheduling entirely', () => {
      const { component } = makeComponent();
      component.daysOfWeek.forEach(d => d.checked = false);

      expect(component.isScheduleConfigured).toBe(false);
    });

    it('is true as soon as any single day is selected', () => {
      const { component } = makeComponent();
      component.daysOfWeek.forEach(d => d.checked = false);
      component.daysOfWeek[0].checked = true;

      expect(component.isScheduleConfigured).toBe(true);
    });
  });

  describe('onDayChange / onTimeChange', () => {
    it('mark the settings as changed so Save reflects there is something to save', () => {
      const { component } = makeComponent();
      expect(component.isSettingsChanged).toBe(false);

      component.onDayChange();
      expect(component.isSettingsChanged).toBe(true);

      component.isSettingsChanged = false;
      component.onTimeChange();
      expect(component.isSettingsChanged).toBe(true);
    });
  });

  describe('saveSettings', () => {
    it('sends the checked days and selected time, and clears the changed flag on success', () => {
      const { component, settingsService, snackBar } = makeComponent();
      component.daysOfWeek.forEach(d => d.checked = false);
      component.daysOfWeek[0].checked = true; // Monday
      component.selectedTime = '09:00';
      component.isSettingsChanged = true;

      component.saveSettings();

      expect(settingsService.saveCronSettings).toHaveBeenCalledWith(component.daysOfWeek, '09:00');
      expect(component.isSettingsChanged).toBe(false);
      expect(component.isSavingSettings).toBe(false);
      expect(snackBar.open).toHaveBeenCalledWith('Scheduler saved', 'Close', expect.anything());
    });

    it('notifies on failure', () => {
      const { component, settingsService, snackBar } = makeComponent();
      settingsService.saveCronSettings.mockReturnValue(throwError(() => new Error('network down')));

      component.saveSettings();

      expect(snackBar.open).toHaveBeenCalledWith('Failed to save scheduler', 'Close', expect.anything());
    });
  });
});
