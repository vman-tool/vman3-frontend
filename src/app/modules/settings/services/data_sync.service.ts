import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface LastScheduleFired {
  day: string;
  time: string;
  fired_at: string;
}

export interface ActiveSyncStatus {
  active: boolean;
  user_name?: string;
  records_saved?: number;
  total_data_count?: number;
  method?: string;
  last_schedule_fired?: LastScheduleFired | null;
}
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root',
})
export class DataSyncService {
  constructor(private http: HttpClient, private configService: ConfigService) { }

  syncData(cached: boolean = false): Observable<any> {
    return this.http
      .post<any>(
        `${this.configService.API_URL}/odk/sync_odk_data_with_async`,
        {}
      )
      .pipe(map((response: any) => response));
  }
  csvDataUpload(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.configService.API_URL}/settings/upload-csv`,
      formData
    );
  }
  // csvDataUpload(cached: boolean = false): Observable<any> {
  //   return this.http
  //     .post<any>(
  //       `${this.configService.API_URL}/odk/fetch_endpoint_with_async`,
  //       {}
  //     )
  //     .pipe(map((response: any) => response));
  // }

  // formsubmission_status method removed - data now included in getSyncStatus()

  /**
   * Sync questions from ODK Central.
   * @param overrideLabels false (default) preserves labels contributed by an
   *        uploaded xForm; true lets ODK's values replace them.
   */
  syncQuestions(overrideLabels: boolean = false) {
    return this.http.post<any>(
      `${this.configService.API_URL}/odk/fetch_form_questions`,
      {},
      { params: { override_labels: overrideLabels } }
    );
  }

  // updateSyncStatus method removed - sync status is now updated automatically by backend

  getSyncStatus() {
    return this.http.get<any>(
      `${this.configService.API_URL}/odk/sync_status`
    );
  }

  getSyncHistory(limit: number = 20) {
    return this.http.get<any>(
      `${this.configService.API_URL}/odk/sync-history?limit=${limit}`
    );
  }

  cancelSync(): Observable<any> {
    return this.http.post<any>(`${this.configService.API_URL}/odk/cancel-sync`, {});
  }

  exportRecords(
    startDate?: string,
    endDate?: string,
    locations?: string[],
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
      params = params.set('locations', locations.join(','));
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

  getExportToken(): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(
      `${this.configService.API_URL}/records/export-token`,
      {}
    );
  }

  getActiveSyncStatus(): Observable<ActiveSyncStatus> {
    return this.http.get<ActiveSyncStatus>(`${this.configService.API_URL}/odk/active-sync`)
      .pipe(catchError(() => of({ active: false })));
  }
}
