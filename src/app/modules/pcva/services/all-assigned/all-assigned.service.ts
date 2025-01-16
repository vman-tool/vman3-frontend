import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root'
})
export class AllAssignedService {

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) { }

  getAssignedVARecords(pager?: {paging?: boolean, page_number?: number, limit?: number}, include_deleted?: string, va_id?: string, coder?: any) {
    let params = pager?.paging ? `?paging=${pager?.paging}`: '';

    params = params?.length && pager?.page_number ? params+`&page=${pager?.page_number}` : pager?.page_number ? params+`?page=${pager?.page_number}` : params;
    params = params?.length && pager?.limit ? params+`&limit=${pager?.limit}` : pager?.limit ? params+`?limit=${pager?.limit}` : params;
    params = params?.length && include_deleted ? params+`&include_deleted=${include_deleted}` : include_deleted ? params+`?include_deleted=${include_deleted}` : params;

    params = params?.length && va_id ? params+`&va_id=${va_id}` : va_id ? params+`?va_id=${va_id}` : params
    params = params?.length && coder ? params+`&coder=${coder}` : coder ? params+`?coder=${coder}` : params

    
    return this.http.get(`${this.configService.API_URL}/pcva/va-assignments${params}`);
  }
  
}
