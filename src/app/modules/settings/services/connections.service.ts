import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { odkConfigModel } from '../interface';

@Injectable({
  providedIn: 'root',
})
export class ConnectionsService {
  API_URL: string = environment.API_URL;
  private odkApiConfigCache: any = null;

  constructor(private http: HttpClient) {}

  saveConnectionData(data: odkConfigModel): Observable<any> {
    return this.http
      .post<any>(`${this.API_URL}/settings/system_configs`, data)
      .pipe(
        map((response: any) => response),
        tap(() => {
          this.odkApiConfigCache = data; // Update cache on save
        }),
        catchError((error: any) => {
          console.error('Error:', error);
          return of({
            data: [],
            message: 'Failed to create connection',
            error: error.message,
            total: 0,
          });
        })
      );
  }

  getOdkApiConfig(cached: boolean = false): Observable<any> {
    if (this.odkApiConfigCache && cached) {
      return of({ data: this.odkApiConfigCache });
    } else {
      return this.http
        .get<any>(`${this.API_URL}/settings/system_configs`, {})
        .pipe(
          map((response: any) => response),
          tap((response: any) => {
            this.odkApiConfigCache = response.data; // Cache the config data
          }),
          catchError((error: any) => {
            console.error('Error:', error);
            return of({
              data: [],
              message: 'Failed to fetch connections',
              error: error.message,
              total: 0,
            });
          })
        );
    }
  }

  clearCache(): void {
    this.odkApiConfigCache = null; // Method to clear cache if needed
  }
}
