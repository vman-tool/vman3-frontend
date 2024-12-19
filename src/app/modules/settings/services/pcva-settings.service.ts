import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root'
})
export class PcvaSettingsService {

  constructor(private http: HttpClient, private configService: ConfigService) { }

  getICD10Codes(pager?: { paging?: boolean, page_number?: number, limit?: number }, search_term?: string){
    let params = pager?.paging ? `?paging=${pager?.paging}` : '';

    params = params?.length && pager?.page_number ? params + `&page=${pager?.page_number}` : pager?.page_number ? params + `?page=${pager?.page_number}` : params;
    params = params?.length && pager?.limit ? params + `&limit=${pager?.limit}` : pager?.limit ? params + `?limit=${pager?.limit}` : params;
    params = params?.length && search_term?.length ? params + `&search_term=${search_term}` : search_term?.length ? params + `?search_term=${search_term}` : params;

    return this.http.get(`${this.configService.API_URL}/pcva/-get-icd10${params}`)
  }
}
