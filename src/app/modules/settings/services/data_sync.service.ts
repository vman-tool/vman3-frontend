import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ConfigService } from 'app/app.service';

import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
@Injectable({
  providedIn: 'root',
})
export class DataSyncService {
  constructor(private http: HttpClient, private configService: ConfigService) {}
  private webSocketSubject = webSocket<string>(
    'ws://localhost:8080/vman/api/v1/ws/download_progress'
  );
  public webSocket$ = this.webSocketSubject.asObservable();

  updateInterval(interval: number): void {
    this.webSocketSubject.next(JSON.stringify(interval));
  }
  syncData(cached: boolean = false): Observable<any> {
    return this.http
      .post<any>(
        `${this.configService.API_URL}/odk/fetch_endpoint_with_async`,
        {}
      )
      .pipe(map((response: any) => response));
  }
}
