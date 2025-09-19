import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root',
})
export class DataSyncService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  syncData(cached: boolean = false): Observable<any> {
    return this.http
      .post<any>(
        `${this.configService.API_URL}/odk/fetch_endpoint_with_async`,
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

  syncQuestions() {
    return this.http.post<any>(
      `${this.configService.API_URL}/odk/fetch_form_questions`,
      {}
    );
  }

  // updateSyncStatus method removed - sync status is now updated automatically by backend

  getSyncStatus() {
    return this.http.get<any>(
      `${this.configService.API_URL}/odk/sync_status`
    );
  }
}
