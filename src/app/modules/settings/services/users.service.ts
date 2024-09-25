import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from 'app/app.service';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

 getUsers(paging?: boolean, page?: number, pageSize?: number) {
    let params = paging ? `?paging=${paging}`: '';

    params = params?.length && page ? params+`&page=${page}` : page ? params+`?page=${page}` : params;
    params = params?.length && pageSize ? params+`&limit=${pageSize}` : pageSize ? params+`?limit=${pageSize}` : params;

    return this.http.get(`${this.configService.API_URL}/users${params}`);
  }
  
}
