import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root'
})
export class Icd10Service {

  constructor(private http: HttpClient, private configService: ConfigService) { }

  getIcd10Codes(paging: boolean=true, page_number:number = 1, limit:number = 10){
    let params = paging ? `?paging=${paging}`: '';

    params = params?.length && page_number ? params+`&page_number=${page_number}` : page_number ? params+`?page_number=${page_number}` : params;
    params = params?.length && limit ? params+`&limit=${limit}` : limit ? params+`?limit=${limit}` : params;
    return this.http.get<any>(`${this.configService.API_URL}/pcva/icd10-categories${params}`);
  }
  
  getIcd10CodesCategories(paging: boolean=true, page_number:number = 1, limit:number = 10){
    let params = paging ? `?paging=${paging}`: '';

    params = params?.length && page_number ? params+`&page_number=${page_number}` : page_number ? params+`?page_number=${page_number}` : params;
    params = params?.length && limit ? params+`&limit=${limit}` : limit ? params+`?limit=${limit}` : params;
    return this.http.get<any>(`${this.configService.API_URL}/pcva/get-icd10${params}`);
  }
}
