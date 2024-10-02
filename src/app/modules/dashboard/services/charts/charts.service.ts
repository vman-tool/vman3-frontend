import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ConfigService } from 'app/app.service';
import { ErrorEmitters } from 'app/core/emitters/error.emitters';

@Injectable({
  providedIn: 'root',
})
export class ChartsService {
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

  getChartfetchStatistics(
    start_date?: string,
    end_date?: string,
    locations?: string[],
    date_type?: string
  ): Observable<any> {
    let params = new HttpParams();
    // .set('page_number', page.toString())
    // .set('limit', limit.toString());

    if (start_date) {
      params = params.set('start_date', start_date);
    }
    if (end_date) {
      params = params.set('end_date', end_date);
    }
    if (date_type) {
      params = params.set('date_type', date_type);
    }
    if (locations && locations.length > 0) {
      params = params.set('locations', locations.join(','));
    }
    return this.http
      .get<any>(`${this.configService.API_URL}/statistics/charts`, { params })
      .pipe(
        map((response: any) => response),
        catchError((error: any) => {
          console.log('Error: ', error);
          return of({
            data: [],
            message: 'Failed to fetch submissions',
            error: error.message,
            total: 0,
          });
        })
      );
  }
}
