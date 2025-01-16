import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';
import { ErrorEmitters } from 'app/core/emitters/error.emitters';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataCleanerService {
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

  getErrorDetails(errorId: string): Observable<any> {
    return this.http
      .get<any>(`${this.configService.API_URL}/data-quality/errors/${errorId}`)
      .pipe(
        map((response: any) => response),
        catchError((error: any) => {
          console.log('Error: ', error);
          return of({
            data: null,
            message: 'Failed to fetch error details',
            error: error.message,
          });
        })
      );
  }

  getFormData(formId: string): Observable<any> {
    return this.http
      .get<any>(
        `${this.configService.API_URL}/data-quality/form-data/${formId}`
      )
      .pipe(
        map((response: any) => response),
        catchError((error: any) => {
          console.log('Error: ', error);
          return of({
            data: null,
            message: 'Failed to fetch form data',
            error: error.message,
          });
        })
      );
  }

  saveCleanedData(formId: string, cleanedData: any): Observable<any> {
    return this.http
      .put<any>(`${this.configService.API_URL}/forms-/${formId}`, cleanedData)
      .pipe(
        map((response: any) => response),
        catchError((error: any) => {
          console.log('Error: ', error);
          return of({
            data: null,
            message: 'Failed to save cleaned data',
            error: error.message,
          });
        })
      );
  }
}
