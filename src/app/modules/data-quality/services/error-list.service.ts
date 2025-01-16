import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';
import { ErrorEmitters } from 'app/core/emitters/error.emitters';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ErrorListService {
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

  getErrorList(
    page: number = 1,
    limit: number = 10,
    errorType?: string,
    group?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('page_number', page.toString())
      .set('limit', limit.toString());

    if (errorType) {
      params = params.set('error_type', errorType);
    }
    if (group) {
      params = params.set('group', group);
    }

    return this.http
      .get<any>(`${this.configService.API_URL}/data-quality/errors`, { params })
      .pipe(
        map((response: any) => response),
        catchError((error: any) => {
          console.log('Error: ', error);
          return of({
            data: [],
            message: 'Failed to fetch error list',
            error: error.message,
            total: 0,
          });
        })
      );
  }
}
