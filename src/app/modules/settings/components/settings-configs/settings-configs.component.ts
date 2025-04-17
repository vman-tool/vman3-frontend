// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-settings-configs',

//   templateUrl: './settings-configs.component.html',
//   styleUrl: './settings-configs.component.scss'
// })
// export class SettingsConfigsComponent {


//   // Settings for API cron calls
//   daysOfWeek = [
//     { name: 'Monday', value: 'monday', checked: false },
//     { name: 'Tuesday', value: 'tuesday', checked: false },
//     { name: 'Wednesday', value: 'wednesday', checked: false },
//     { name: 'Thursday', value: 'thursday', checked: false },
//     { name: 'Friday', value: 'friday', checked: false },
//     { name: 'Saturday', value: 'saturday', checked: false },
//     { name: 'Sunday', value: 'sunday', checked: false }
//   ];

//   selectedTime: string = '00:00';
//   isSettingsChanged: boolean = false;

//   // Settings for data backup
//   backupSettings = {
//     frequency: 'daily',
//     time: '00:00',
//     location: 'local'
//   };
//   isBackupSettingsChanged: boolean = false;

//   constructor() {}

//   onDayChange() {
//     this.isSettingsChanged = true;
//   }

//   onTimeChange() {
//     this.isSettingsChanged = true;
//   }

//   onBackupSettingsChange() {
//     this.isBackupSettingsChanged = true;
//   }

//   saveSettings() {
//     // Logic to save API cron settings
//     console.log('Saving API cron settings:', this.daysOfWeek, this.selectedTime);
//     this.isSettingsChanged = false;
//   }

//   saveBackupSettings() {
//     // Logic to save backup settings
//     console.log('Saving backup settings:', this.backupSettings);
//     this.isBackupSettingsChanged = false;
//   }
// }


import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { BackupSettings, DataSyncSettingsService, DayOfWeek } from '../../services/data_sync_settings.service';

@Component({
  selector: 'app-settings-configs',
  templateUrl: './settings-configs.component.html',
  styleUrls: ['./settings-configs.component.scss']
})
export class SettingsConfigsComponent implements OnInit {
  // Settings for API cron calls
  daysOfWeek: DayOfWeek[] = [
    { name: 'Monday', value: 'monday', checked: false },
    { name: 'Tuesday', value: 'tuesday', checked: false },
    { name: 'Wednesday', value: 'wednesday', checked: false },
    { name: 'Thursday', value: 'thursday', checked: false },
    { name: 'Friday', value: 'friday', checked: false },
    { name: 'Saturday', value: 'saturday', checked: false },
    { name: 'Sunday', value: 'sunday', checked: false }
  ];

  selectedTime: string = '00:00';
  isSettingsChanged: boolean = false;
  isSavingSettings: boolean = false;
  settingsError: string | null = null;

  // Settings for data backup
  backupSettings: BackupSettings = {
    frequency: 'daily',
    time: '00:00',
    location: 'local'
  };
  isBackupSettingsChanged: boolean = false;
  isSavingBackupSettings: boolean = false;
  backupSettingsError: string | null = null;

  // Loading states
  isLoadingSettings: boolean = false;
  isLoadingBackupSettings: boolean = false;

  constructor(private settingsService: DataSyncSettingsService) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadBackupSettings();
  }

  loadSettings(): void {
    this.isLoadingSettings = true;
    this.settingsService.getCronSettings()
      .pipe(finalize(() => this.isLoadingSettings = false))
      .subscribe({
        next: (response: { days: string | string[]; time: string; }) => {
          // Update days of week based on response
          this.daysOfWeek.forEach(day => {
            day.checked = response.days.includes(day.value);
          });
          this.selectedTime = response.time || '00:00';
          this.isSettingsChanged = false;
        },
        error: (error: any) => {
          console.error('Error loading cron settings', error);
          this.settingsError = 'Failed to load settings. Please try again.';
        }
      });
  }

  loadBackupSettings(): void {
    this.isLoadingBackupSettings = true;
    this.settingsService.getBackupSettings()
      .pipe(finalize(() => this.isLoadingBackupSettings = false))
      .subscribe({
        next: (response: BackupSettings) => {
          this.backupSettings = response;
          this.isBackupSettingsChanged = false;
        },
        error: (error: any) => {
          console.error('Error loading backup settings', error);
          this.backupSettingsError = 'Failed to load backup settings. Please try again.';
        }
      });
  }

  onDayChange(): void {
    this.isSettingsChanged = true;
    this.settingsError = null;
  }

  onTimeChange(): void {
    this.isSettingsChanged = true;
    this.settingsError = null;
  }

  onBackupSettingsChange(): void {
    this.isBackupSettingsChanged = true;
    this.backupSettingsError = null;
  }

  saveSettings(): void {
    this.isSavingSettings = true;
    this.settingsError = null;

    this.settingsService.saveCronSettings(this.daysOfWeek, this.selectedTime)
      .pipe(finalize(() => this.isSavingSettings = false))
      .subscribe({
        next: () => {
          console.log('Cron settings saved successfully');
          this.isSettingsChanged = false;
        },
        error: (error: any) => {
          console.error('Error saving cron settings', error);
          this.settingsError = 'Failed to save settings. Please try again.';
        },
      complete: () => {
          this.isSavingSettings = false;
        }
      });
  }

  saveBackupSettings(): void {
    this.isSavingBackupSettings = true;
    this.backupSettingsError = null;

    this.settingsService.saveBackupSettings(this.backupSettings)
      .pipe(finalize(() => this.isSavingBackupSettings = false))
      .subscribe({
        next: () => {
          console.log('Backup settings saved successfully');
          this.isBackupSettingsChanged = false;
        },
        error: (error: any) => {
          console.error('Error saving backup settings', error);
          this.backupSettingsError = 'Failed to save backup settings. Please try again.';
        }
      });
  }
}
