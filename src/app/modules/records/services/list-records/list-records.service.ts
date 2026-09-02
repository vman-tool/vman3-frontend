import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';
import { ErrorEmitters } from 'app/core/emitters/error.emitters';
import { LocationSelection } from 'app/shared/components/location-tree-select/location-tree-select.component';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ListRecordsService {
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

  getRecordsData(
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    locations?: LocationSelection[],
    searchBy?: string,
    searchValue?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('page_number', page.toString())
      .set('limit', limit.toString());

    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    if (locations && locations.length > 0) {
      params = params.set('locations', JSON.stringify(locations.map(l => ({ field: l.field, value: l.value }))));
    }
    // Only include search parameters when a search value is provided
    if (searchValue) {
      params = params.set('search_by', searchBy || '');
      params = params.set('search_value', searchValue);
    }

    // debug: log request URL and params
    try {
      // eslint-disable-next-line no-console
      console.log('ListRecordsService.getRecordsData', `${this.configService.API_URL}/records`, params.toString());
    } catch (e) {}

    return this.http.get<any>(`${this.configService.API_URL}/records`, { params }).pipe(
      map((response: any) => response),
      catchError((error: any) => {
        console.log('Error: ', error);
        return of({
          data: [],
          message: 'Failed to fetch records',
          error: error.message,
          total: 0,
        });
      })
    );
  }

  exportRecords(
    startDate?: string,
    endDate?: string,
    locations?: LocationSelection[],
    dateType?: string,
    resultsFilter?: string
  ): Observable<Blob> {
    let params = new HttpParams().set('file_format', 'excel');

    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    if (locations && locations.length > 0) {
      params = params.set('locations', JSON.stringify(locations.map(l => ({ field: l.field, value: l.value }))));
    }
    if (dateType) {
      params = params.set('date_type', dateType);
    }
    if (resultsFilter) {
      params = params.set('results_filter', resultsFilter);
    }

    return this.http.get(`${this.configService.API_URL}/records/export`, {
      params,
      responseType: 'blob'
    });
  }

  getCauseOfDeath(vaId: string, includeCcva: boolean, includePcva: boolean): Observable<any> {
    const params = new HttpParams()
      .set('include_ccva', includeCcva)
      .set('include_pcva', includePcva);

    return this.http.get<any>(
      `${this.configService.API_URL}/records/${encodeURIComponent(vaId)}/cause-of-death`,
      { params }
    );
  }
}
