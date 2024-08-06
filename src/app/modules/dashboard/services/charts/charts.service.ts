import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ErrorEmitters } from '../../../../core/emitters/error.emitters';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ChartsService {
  API_URL: string = environment.API_URL;
  error?: string;
  success?: boolean;

  constructor(private http: HttpClient) {
    ErrorEmitters.errorEmitter.subscribe((error: any) => {
      this.error = error;
    });
    ErrorEmitters.successEmitter.subscribe(() => {
      this.success = true;
    });
  }

  getChartfetchStatistics(
    startDate?: string,
    endDate?: string,
    locations?: string[]
  ): Observable<any> {
    let params = new HttpParams();
    // .set('page_number', page.toString())
    // .set('limit', limit.toString());

    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    if (locations && locations.length > 0) {
      params = params.set('locations', locations.join(','));
    }
    console.log('Loading records');
    return this.http
      .get<any>(`${this.API_URL}/statistics/charts`, { params })
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
