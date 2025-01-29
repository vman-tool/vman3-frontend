import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root'
})
export class CodersService {

  constructor(private http: HttpClient, private configService: ConfigService) { }

  getCoders(pager?: { paging?: boolean, page_number?: number, limit?: number }, include_deleted?: boolean) {
    let params = pager?.paging ? `?paging=${pager?.paging}` : '';

    params = params?.length && pager?.page_number ? params + `&page_number=${pager?.page_number}` : pager?.page_number ? params + `?page_number=${pager?.page_number}` : params;
    params = params?.length && pager?.limit ? params + `&limit=${pager?.limit}` : pager?.limit ? params + `?limit=${pager?.limit}` : params;
    params = params?.length && include_deleted ? params + `&include_deleted=${include_deleted}` : include_deleted ? params + `?include_deleted=${include_deleted}` : params;

    return this.http.get(`${this.configService.API_URL}/pcva/coders${params}`);
  }
}
