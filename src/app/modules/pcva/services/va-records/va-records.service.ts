import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root'
})
export class VaRecordsService {

  constructor(private http: HttpClient, private configService: ConfigService) { }

  getVARecords(paging?: boolean, page_number?: number, limit?: number, include_assignments?: boolean, format_records: boolean = true, va_id?: string) {
    // TODO: PASS permissions for coders to get filtered coders
    let params = paging ? `?paging=${paging}`: '';

    params = params?.length && page_number ? params+`&page_number=${page_number}` : page_number ? params+`?page_number=${page_number}` : params;
    params = params?.length && limit ? params+`&limit=${limit}` : limit ? params+`?limit=${limit}` : params;
    params = params?.length && include_assignments ? params+`&include_assignment=${include_assignments}` : include_assignments ? params+`?include_assignment=${include_assignments}` : params;
    params = params?.length && va_id ? params+`&va_id=${va_id}` : va_id ? params+`?va_id=${va_id}` : params;
    params = params?.length ? params+`&format_records=${format_records}` : params+`?format_records=${format_records}`;

    
    return this.http.get(`${this.configService.API_URL}/pcva${params}`);
  }

  /**
   * @param filters optional narrowing before assignment - `location` is a value
   *   of the configured level-1 location field, the dates are inclusive ISO
   *   dates, and `data_source` is 'odk_api' or 'uploaded_csv'. Omitted keys
   *   are simply not sent, so the default remains "everything".
   */
  getUnassignedVARecords(
    pager?: {paging?: boolean, page_number?: number, limit?: number},
    coder?: any,
    filters?: {location?: string, start_date?: string, end_date?: string, data_source?: string, assigned_to?: string}
  ) {
    let params = new HttpParams();

    if (pager?.paging) { params = params.set('paging', pager.paging); }
    if (pager?.page_number) { params = params.set('page_number', pager.page_number); }
    if (pager?.limit) { params = params.set('limit', pager.limit); }
    if (coder) { params = params.set('coder', coder); }

    for (const [key, value] of Object.entries(filters ?? {})) {
      if (value) { params = params.set(key, value); }
    }

    return this.http.get(`${this.configService.API_URL}/pcva/get-unassigned-va`, { params });
  }
  
  getUncodedAssignedVARecords(pager?: {paging?: boolean, page_number?: number, limit?: number}, coder?: any) {
    let params = pager?.paging ? `?paging=${pager?.paging}`: '';

    params = params?.length && pager?.page_number ? params+`&page_number=${pager?.page_number}` : pager?.page_number ? params+`?page_number=${pager?.page_number}` : params;
    params = params?.length && pager?.limit ? params+`&limit=${pager?.limit}` : pager?.limit ? params+`?limit=${pager?.limit}` : params;
    
    params = params?.length && coder ? params+`&coder=${coder}` : coder ? params+`?coder=${coder}` : params

    
    return this.http.get(`${this.configService.API_URL}/pcva/get-uncoded-assigned-va${params}`);
  }
  
  assignVARecords(data: any) {
    return this.http.post(`${this.configService.API_URL}/pcva/assign-va`, data);
  }
  
  unassignVARecords(data: any) {
    return this.http.post(`${this.configService.API_URL}/pcva/unassign-va`, data);
  }

  getQuestions(va_questions_ids?: string[]){
    const params = va_questions_ids?.length ? `?questions_keys=${va_questions_ids.join(',')}` : ""
    return this.http.get(`${this.configService.API_URL}/pcva/form-questions${params}`);
  }

  /**
   * Ask the VMan ML model for a probable cause of death for one VA record.
   * Takes roughly 20 seconds: the embedding and prediction dominate, so the
   * caller must show progress rather than a brief spinner.
   */
  analyseVaWithMl(va_id: string) {
    return this.http.post(`${this.configService.API_URL}/pcva/ml-analysis`, { va_id });
  }

  codeAssignedVA(va_data: any) {
    return this.http.post(`${this.configService.API_URL}/pcva/code-assigned-va`, va_data);
  }
}
