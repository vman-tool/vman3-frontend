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

@Injectable({
  providedIn: 'root'
})
export class DataSyncSettingsService {

  constructor(private http: HttpClient, private configService: ConfigService) {}


  // Save API cron settings
  saveCronSettings(daysOfWeek: DayOfWeek[], selectedTime: string): Observable<any> {
    const payload = {
      days: daysOfWeek.filter(day => day.checked).map(day => day.value),
      time: selectedTime
    };

    return this.http.post<ApiResponse<any>>(`${this.configService.API_URL}/settings/cron`, payload).pipe(
      map(response => response.data),
      tap(response => console.log('Cron settings saved successfully', response)),
      catchError(this.handleError('saveCronSettings', {}))
    );
  }

  // Save backup settings
  saveBackupSettings(backupSettings: BackupSettings): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.configService.API_URL}/settings/backup`, backupSettings).pipe(
      map(response => response.data),
      tap(response => console.log('Backup settings saved successfully', response)),
      catchError(this.handleError('saveBackupSettings', {}))
    );
  }

  // Get API cron settings
  getCronSettings(): Observable<{days: string[], time: string}> {
    return this.http.get<ApiResponse<any>>(`${this.configService.API_URL}/settings/cron`).pipe(
      map(response => {
        // The API now returns the cron settings directly
        return response.data || { days: [], time: '00:00' };
      }),
      tap(response => console.log('Fetched cron settings', response)),
      catchError(this.handleError('getCronSettings', {days: [], time: '00:00'}))
    );
  }

  // Get backup settings
  getBackupSettings(): Observable<BackupSettings> {
    return this.http.get<ApiResponse<any>>(`${this.configService.API_URL}/settings/backup`).pipe(
      map(response => {
        // The API now returns the backup settings directly
        return response.data || {
          frequency: 'daily',
          time: '00:00',
          location: 'local'
        };
      }),
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
