import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root',
})
export class RunCcvaService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  run_ccva(filter: {}) {
    return this.http.post(`${this.configService.API_URL}/ccva`, {
      ...filter,
    });
  }
}
