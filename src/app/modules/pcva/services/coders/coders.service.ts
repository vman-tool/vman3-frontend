import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CodersService {

  API_URL: string = environment.API_URL;

  constructor(private http: HttpClient) { }

  getCoders(paging?: boolean, page?: number, pageSize?: number) {
    // TODO: PASS permissions for coders to get filtered coders
    let params = paging ? `?paging=${paging}`: '';

    params = params?.length && page ? params+`&page=${page}` : page ? params+`?page=${page}` : params;
    params = params?.length && pageSize ? params+`&limit=${pageSize}` : pageSize ? params+`?limit=${pageSize}` : params;

    
    return this.http.get(`${this.API_URL}/users${params}`);
  }
}
