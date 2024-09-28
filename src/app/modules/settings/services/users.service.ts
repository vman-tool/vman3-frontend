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

 getUsers(pager?: {paging?: boolean, page_number?: number, limit?: number}, include_deleted?: string) {
     let params = pager?.paging ? `?paging=${pager?.paging}`: '';

    params = params?.length && pager?.page_number ? params+`&page=${pager?.page_number}` : pager?.page_number ? params+`?page=${pager?.page_number}` : params;
    params = params?.length && pager?.limit ? params+`&limit=${pager?.limit}` : pager?.limit ? params+`?limit=${pager?.limit}` : params;
    params = params?.length && include_deleted ? params+`&include_deleted=${include_deleted}` : include_deleted ? params+`?include_deleted=${include_deleted}` : params;

    return this.http.get(`${this.configService.API_URL}/users${params}`);
  }
 
  getRoles(pager?: {paging?: boolean, page_number?: number, limit?: number}, include_deleted?: string) {
     let params = pager?.paging ? `?paging=${pager?.paging}`: '';

    params = params?.length && pager?.page_number ? params+`&page=${pager?.page_number}` : pager?.page_number ? params+`?page=${pager?.page_number}` : params;
    params = params?.length && pager?.limit ? params+`&limit=${pager?.limit}` : pager?.limit ? params+`?limit=${pager?.limit}` : params;
    params = params?.length && include_deleted ? params+`&include_deleted=${include_deleted}` : include_deleted ? params+`?include_deleted=${include_deleted}` : params;

    return this.http.get(`${this.configService.API_URL}/users/roles${params}`);
  }
  
  saveRole(role: any) {
    return this.http.post(`${this.configService.API_URL}/users/roles`, role);
  }

  getPrivileges(){
    return this.http.get(`${this.configService.API_URL}/users/privileges`);
  }
  
}
