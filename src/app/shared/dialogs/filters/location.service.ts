import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ErrorEmitters } from 'app/core/emitters/error.emitters';
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private locationsCache: string[] | null = null;
  error?: string;
  success?: boolean;

  constructor(private http: HttpClient, private configService: ConfigService) {
    ErrorEmitters.errorEmitter.subscribe((error: any) => {
      this.error = error;
    });
    ErrorEmitters.successEmitter.subscribe(() => {
      this.success = true;
    });
  }

  getLocations(): Observable<string[]> {
    if (this.locationsCache) {
      // Return cached locations if they exist
      return of(this.locationsCache);
    } else {
      return this.http.get<any>(`${this.configService.API_URL}/records/unique-regions`).pipe(
        map((response) => response.data),
        tap((locations) => (this.locationsCache = locations)),
        catchError(this.handleError<string[]>('getLocations', []))
      );
    }
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
}
