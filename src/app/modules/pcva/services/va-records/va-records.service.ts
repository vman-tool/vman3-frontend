import { HttpClient } from '@angular/common/http';
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

  getUnassignedVARecords(pager?: {paging?: boolean, page_number?: number, limit?: number}, coder?: any) {
    let params = pager?.paging ? `?paging=${pager?.paging}`: '';

    params = params?.length && pager?.page_number ? params+`&page_number=${pager?.page_number}` : pager?.page_number ? params+`?page_number=${pager?.page_number}` : params;
    params = params?.length && pager?.limit ? params+`&limit=${pager?.limit}` : pager?.limit ? params+`?limit=${pager?.limit}` : params;
    
    params = params?.length && coder ? params+`&coder=${coder}` : coder ? params+`?coder=${coder}` : params

    
    return this.http.get(`${this.configService.API_URL}/pcva/get-unassigned-va${params}`);
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

  codeAssignedVA(va_data: any) {
    return this.http.post(`${this.configService.API_URL}/pcva/code-assigned-va`, va_data);
  }
}
