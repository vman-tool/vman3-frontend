// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable, of } from 'rxjs';
// import { catchError, tap } from 'rxjs/operators';
// import { ConfigService } from 'app/app.service';

// export interface DayOfWeek {
//   name: string;
//   value: string;
//   checked: boolean;
// }

// export interface BackupSettings {
//   frequency: 'daily' | 'weekly' | 'monthly';
//   time: string;
//   location: 'local' | 'cloud';
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class DataSyncSettingsService {
// constructor(private http: HttpClient, private configService: ConfigService) {}


//   // Save API cron settings
//   saveCronSettings(daysOfWeek: DayOfWeek[], selectedTime: string): Observable<any> {
//     const payload = {
//       days: daysOfWeek.filter(day => day.checked).map(day => day.value),
//       time: selectedTime
//     };

//     return this.http.post(`${this.configService.API_URL}/settings/cron`, payload).pipe(
//       tap(response => console.log('Cron settings saved successfully', response)),
//       catchError(this.handleError('saveCronSettings', {}))
//     );
//   }

//   // Save backup settings
//   saveBackupSettings(backupSettings: BackupSettings): Observable<any> {
//     return this.http.post(`${this.configService.API_URL}/settings/backup`, backupSettings).pipe(
//       tap(response => console.log('Backup settings saved successfully', response)),
//       catchError(this.handleError('saveBackupSettings', {}))
//     );
//   }

//   // Get API cron settings
//   getCronSettings(): Observable<{days: string[], time: string}> {
//     return this.http.get<{days: string[], time: string}>(`${this.configService.API_URL}/settings/cron`).pipe(
//       tap(response => console.log('Fetched cron settings', response)),
//       catchError(this.handleError('getCronSettings', {days: [], time: '00:00'}))
//     );
//   }

//   // Get backup settings
//   getBackupSettings(): Observable<BackupSettings> {
//     return this.http.get<BackupSettings>(`${this.configService.API_URL}/settings/backup`).pipe(
//       tap(response => console.log('Fetched backup settings', response)),
//       catchError(this.handleError('getBackupSettings', {
//         frequency: 'daily',
//         time: '00:00',
//         location: 'local'
//       } as BackupSettings))
//     );
//   }

//   // Error handler
//   private handleError<T>(operation = 'operation', result?: T) {
//     return (error: any): Observable<T> => {
//       console.error(`${operation} failed:`, error);
//       // Let the app keep running by returning a safe result
//       return of(result as T);
//     };
//   }
// }





import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ConfigService } from 'app/app.service';

export interface DayOfWeek {
  name: string;
  value: string;
  checked: boolean;
}

export interface BackupSettings {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  location: 'local' | 'cloud';
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  status?: string;
}

export interface SyncSettings {
  cron_settings: {
    days: string[];
    time: string;
  };
  backup_settings: BackupSettings;
}

@Injectable({
  providedIn: 'root'
})
export class DataSyncSettingsService {
  private syncSettingsCache: SyncSettings | null = null;
  private lastFetchTime: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient, private configService: ConfigService) {}

  // Unified method to get both cron and backup settings
  getSyncSettings(useCache: boolean = true): Observable<SyncSettings> {
    const now = Date.now();
    const isCacheValid = this.syncSettingsCache && useCache && (now - this.lastFetchTime) < this.CACHE_DURATION;

    if (isCacheValid) {
      console.log('Using cached sync settings data');
      return of(this.syncSettingsCache!);
    }

    console.log('Fetching fresh sync settings data from API');
    return this.http.get<ApiResponse<SyncSettings>>(`${this.configService.API_URL}/settings/sync-settings`).pipe(
      map(response => {
        const settings = response.data || {
          cron_settings: { days: [], time: '00:00' },
          backup_settings: {
            frequency: 'daily',
            time: '00:00',
            location: 'local'
          }
        };

        // Update cache
        this.syncSettingsCache = settings;
        this.lastFetchTime = now;

        return settings;
      }),
      tap(response => console.log('Fetched sync settings', response)),
      catchError(this.handleError('getSyncSettings', {
        cron_settings: { days: [], time: '00:00' },
        backup_settings: {
          frequency: 'daily',
          time: '00:00',
          location: 'local'
        }
      } as SyncSettings))
    );
  }

  // Clear cache method
  clearCache(): void {
    this.syncSettingsCache = null;
    this.lastFetchTime = 0;
    console.log('Sync settings cache cleared');
  }

  // Save API cron settings
  saveCronSettings(daysOfWeek: DayOfWeek[], selectedTime: string): Observable<any> {
    const payload = {
      days: daysOfWeek.filter(day => day.checked).map(day => day.value),
      time: selectedTime
    };

    return this.http.post<ApiResponse<any>>(`${this.configService.API_URL}/settings/cron`, payload).pipe(
      map(response => response.data),
      tap(response => {
        console.log('Cron settings saved successfully', response);
        this.clearCache(); // Clear cache after saving
      }),
      catchError(this.handleError('saveCronSettings', {}))
    );
  }

  // Save backup settings
  saveBackupSettings(backupSettings: BackupSettings): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.configService.API_URL}/settings/backup`, backupSettings).pipe(
      map(response => response.data),
      tap(response => {
        console.log('Backup settings saved successfully', response);
        this.clearCache(); // Clear cache after saving
      }),
      catchError(this.handleError('saveBackupSettings', {}))
    );
  }

  // Get API cron settings (uses unified endpoint)
  getCronSettings(): Observable<{days: string[], time: string}> {
    return this.getSyncSettings().pipe(
      map(syncSettings => syncSettings.cron_settings),
      tap(response => console.log('Fetched cron settings', response)),
      catchError(this.handleError('getCronSettings', {days: [], time: '00:00'}))
    );
  }

  // Get backup settings (uses unified endpoint)
  getBackupSettings(): Observable<BackupSettings> {
    return this.getSyncSettings().pipe(
      map(syncSettings => syncSettings.backup_settings),
      tap(response => console.log('Fetched backup settings', response)),
      catchError(this.handleError('getBackupSettings', {
        frequency: 'daily',
        time: '00:00',
        location: 'local'
      } as BackupSettings))
    );
  }

  // Error handler
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      // Let the app keep running by returning a safe result
      return of(result as T);
    };
  }
}
