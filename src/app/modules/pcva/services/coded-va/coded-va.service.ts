import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root'
})
export class CodedVaService {

  constructor(private configService: ConfigService, private http: HttpClient) { }

  getCodedVARecords(pager?: { paging?: boolean, page_number?: number, limit?: number }, include_deleted?: boolean, coder?: any) {
    let params = pager?.paging ? `?paging=${pager?.paging}` : '';

    params = params?.length && pager?.page_number ? params + `&page_number=${pager?.page_number}` : pager?.page_number ? params + `?page_number=${pager?.page_number}` : params;
    params = params?.length && pager?.limit ? params + `&limit=${pager?.limit}` : pager?.limit ? params + `?limit=${pager?.limit}` : params;
    params = params?.length && include_deleted ? params + `&include_deleted=${include_deleted}` : include_deleted ? params + `?include_deleted=${include_deleted}` : params;

    params = params?.length && coder ? params + `&coder=${coder}` : coder ? params + `?coder=${coder}` : params


    return this.http.get(`${this.configService.API_URL}/pcva/get-coded-va${params}`);
  }
  
  getCodedVADetails(pager?: { paging?: boolean, page_number?: number, limit?: number }, include_deleted?: boolean, va?: string, coder?: any, include_history: boolean = false) {
    let params = pager?.paging ? `?paging=${pager?.paging}` : '';

    params = params?.length && pager?.page_number ? params + `&page=${pager?.page_number}` : pager?.page_number ? params + `?page=${pager?.page_number}` : params;
    params = params?.length && pager?.limit ? params + `&limit=${pager?.limit}` : pager?.limit ? params + `?limit=${pager?.limit}` : params;
    params = params?.length && include_deleted ? params + `&include_deleted=${include_deleted}` : include_deleted ? params + `?include_deleted=${include_deleted}` : params;

    params = params?.length && coder ? params + `&coder=${coder}` : coder ? params + `?coder=${coder}` : params
    params = params?.length && include_history ? params + `&include_history=${include_history}` : params


    return this.http.get(`${this.configService.API_URL}/pcva/get-coded-va-details/${va}${params}`);
  }

  downloadPcvaResults() {
     return this.http
     .get(`${this.configService.API_URL}/pcva/export-pcva-results`, { responseType: 'blob' })
      .subscribe((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pcva_results.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      });;
  }
}
