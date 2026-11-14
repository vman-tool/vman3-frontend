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
    searchValue?: string,
    sortBy?: string,
    sortDir?: string,
    filterBy?: string,
    filterValue?: string
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
    if (sortBy) {
      params = params.set('sort_by', sortBy).set('sort_dir', sortDir || 'asc');
    }
    // Broad/Major Category and Algorithm - the CCVA columns denormalized
    // onto each record from whichever run is marked default. Specific
    // Cause has too many distinct values for a useful filter dropdown
    // (same reasoning as CCVA's own Filter By).
    if (filterBy && filterValue) {
      params = params.set('filter_by', filterBy).set('filter_value', filterValue);
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

  // Group By's Broad/Major/Specific Cause summary (Group/Count/Percent) -
  // same filter params as getRecordsData (date range/location/search/
  // Filter By-Value) but no paging, same reasoning as CCVA's own grouped
  // results (a handful of group values, not a page of records).
  getGroupedRecords(
    groupBy: string,
    startDate?: string,
    endDate?: string,
    locations?: LocationSelection[],
    searchBy?: string,
    searchValue?: string,
    filterBy?: string,
    filterValue?: string
  ): Observable<any> {
    let params = new HttpParams().set('group_by', groupBy);

    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    if (locations && locations.length > 0) {
      params = params.set('locations', JSON.stringify(locations.map(l => ({ field: l.field, value: l.value }))));
    }
    if (searchValue) {
      params = params.set('search_by', searchBy || '');
      params = params.set('search_value', searchValue);
    }
    if (filterBy && filterValue) {
      params = params.set('filter_by', filterBy).set('filter_value', filterValue);
    }

    return this.http.get<any>(`${this.configService.API_URL}/records/grouped`, { params }).pipe(
      catchError((error: any) => of({
        data: [],
        message: 'Failed to fetch grouped records',
        error: error.message,
        total: 0,
      }))
    );
  }

  // Distinct Broad/Major/Specific Cause values for the Filter By dropdown.
  // Broad/Major come from the full configured target cause list, not just
  // whatever the currently default CCVA run happens to use (see the
  // backend route's own comment for why) - Specific Cause is the distinct
  // values actually present (there's no fixed universe to enumerate).
  getCcvaFilterOptions(): Observable<any> {
    return this.http.get<any>(`${this.configService.API_URL}/records/ccva-filter-options`).pipe(
      catchError(() => of({ data: { broad: [], major: [], specific: [] } }))
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

  // taskId scopes the CCVA cause to one specific run (CCVA > Display Data,
  // where the run being viewed is unambiguous) instead of whichever run is
  // currently marked default (every other caller - VA Records, PCVA
  // screens - which omit it).
  getCauseOfDeath(vaId: string, includeCcva: boolean, includePcva: boolean, taskId?: string): Observable<any> {
    let params = new HttpParams()
      .set('include_ccva', includeCcva)
      .set('include_pcva', includePcva);
    if (taskId) {
      params = params.set('task_id', taskId);
    }

    return this.http.get<any>(
      `${this.configService.API_URL}/records/${encodeURIComponent(vaId)}/cause-of-death`,
      { params }
    );
  }
}
