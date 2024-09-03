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

  syncQuestions(){
    return this.http.post<any>(`${this.configService.API_URL}/odk/fetch_form_questions`, {})
  }
}
