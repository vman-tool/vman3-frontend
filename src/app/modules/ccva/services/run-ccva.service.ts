import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RunCcvaService {
  constructor(private http: HttpClient, private configService: ConfigService) {}
  runCcvaWithCSV(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.configService.API_URL}/ccva/upload`,
      formData
    );
  }

  run_ccva(filter: {}) {
    return this.http.post(`${this.configService.API_URL}/ccva`, {
      ...filter,
    });
  }
}
@Injectable({
  providedIn: 'root',
})
export class RunCcvaPublicService {
  constructor(private http: HttpClient, private configService: ConfigService) {}
  runCcvaWithCSV(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.configService.API_URL}/ccva_public/upload`,
      formData
    );
  }

  deleteCcvaByTaskId(taskId: string): Observable<any> {
    return this.http.delete(
      `${this.configService.API_URL}/ccva_public/task/${taskId}`
    );
  }
}
