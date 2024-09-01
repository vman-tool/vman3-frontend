import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from '../../../app.service';

@Injectable({
  providedIn: 'root',
})
export class CcvaService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  get_ccva_Results() {
    return this.http.get(`${this.configService.API_URL}/ccva`, {});
  }
}
