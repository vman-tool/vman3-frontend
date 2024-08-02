import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VaRecordsService {

  API_URL: string = environment.API_URL;

  constructor(private http: HttpClient) { }

  getVARecords(paging?: boolean, page_number?: number, limit?: number, include_assignments?: boolean) {
    // TODO: PASS permissions for coders to get filtered coders
    let params = paging ? `?paging=${paging}`: '';

    params = params?.length && page_number ? params+`&page=${page_number}` : page_number ? params+`?page=${page_number}` : params;
    params = params?.length && limit ? params+`&limit=${limit}` : limit ? params+`?limit=${limit}` : params;
    params = params?.length && include_assignments ? params+`&include_assignment=${include_assignments}` : include_assignments ? params+`?include_assignment=${include_assignments}` : params;

    
    return this.http.get(`${this.API_URL}/pcva${params}`);
  }
}
