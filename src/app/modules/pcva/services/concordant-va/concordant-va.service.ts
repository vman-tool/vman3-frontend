import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';

@Injectable({ providedIn: 'root' })
export class ConcordantVaService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  /** VA records the physicians agree on, at the configured concordance level. */
  getConcordantVARecords(pager?: { paging?: boolean; page_number?: number; limit?: number }) {
    let params = new HttpParams();
    if (pager?.paging) { params = params.set('paging', pager.paging); }
    if (pager?.page_number) { params = params.set('page_number', pager.page_number); }
    if (pager?.limit) { params = params.set('limit', pager.limit); }
    return this.http.get(`${this.configService.API_URL}/pcva/concordant-va`, { params });
  }
}
