import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root'
})
export class CodersService {

  constructor(private http: HttpClient, private configService: ConfigService) { }

  getCoders(paging?: boolean, page?: number, pageSize?: number) {
    // TODO: PASS permissions for coders to get filtered coders
    let params = paging ? `?paging=${paging}`: '';

    params = params?.length && page ? params+`&page=${page}` : page ? params+`?page=${page}` : params;
    params = params?.length && pageSize ? params+`&limit=${pageSize}` : pageSize ? params+`?limit=${pageSize}` : params;

    
    return this.http.get(`${this.configService.API_URL}/users${params}`);
  }
}
