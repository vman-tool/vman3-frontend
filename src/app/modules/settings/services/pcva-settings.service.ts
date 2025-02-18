import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';
import { PCVAConfigurations } from '../interface';

@Injectable({
  providedIn: 'root'
})
export class PcvaSettingsService {

  constructor(private http: HttpClient, private configService: ConfigService) { }

  getICD10Codes(pager?: { paging?: boolean, page_number?: number, limit?: number }, search_term?: string){
    let params = `?paging=${pager?.paging}`;

    params = params?.length && pager?.page_number ? params + `&page_number=${pager?.page_number}` : pager?.page_number ? params + `?page_number=${pager?.page_number}` : params;
    params = params?.length && pager?.limit ? params + `&limit=${pager?.limit}` : pager?.limit ? params + `?limit=${pager?.limit}` : params;
    params = params?.length && search_term?.length ? params + `&search_term=${search_term}` : search_term?.length ? params + `?search_term=${search_term}` : params;

    return this.http.get(`${this.configService.API_URL}/pcva/get-icd10${params}`)
  }

  createICD10Code(code: any[]){
    return this.http.post(`${this.configService.API_URL}/pcva/create-icd10`, code);
  }
  
  bulkUploadICD10Codes(file: any){
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    return this.http.post(`${this.configService.API_URL}/pcva/upload-icd10-data`, formData);
  }

  createICD10Category(category: any){
    return this.http.post(`${this.configService.API_URL}/pcva/create-icd10-categories`, [category]);
  }

  getICD10Categories(pager?: { paging?: boolean, page_number?: number, limit?: number }, search_term?: string){
    let params = `?paging=${pager?.paging}`;

    params = params?.length && pager?.page_number ? params + `&page=${pager?.page_number}` : pager?.page_number ? params + `?page=${pager?.page_number}` : params;
    params = params?.length && pager?.limit ? params + `&limit=${pager?.limit}` : pager?.limit ? params + `?limit=${pager?.limit}` : params;
    params = params?.length && search_term?.length ? params + `&search_term=${search_term}` : search_term?.length ? params + `?search_term=${search_term}` : params;

    return this.http.get(`${this.configService.API_URL}/pcva/icd10-categories${params}`)
  }

  getPCVAConfigurations(){
    return this.http.get(`${this.configService.API_URL}/pcva/get-configurations`)
  }

  savePCVAConfigurations(configurations: PCVAConfigurations){
    return this.http.post(`${this.configService.API_URL}/pcva/save-configurations`, configurations)
  }
}
