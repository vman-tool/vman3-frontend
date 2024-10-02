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

  saveUser(user: any): Observable<any> {
    return this.http.post(`${this.configService.API_URL}/users/`, user);
  }
  
  updateUser(user: any): Observable<any> {
    console.log("user: ", user)
    return this.http.put(`${this.configService.API_URL}/users/`, user);
  }

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
  
  getUserRoles(user_uuid?: string){
    let params = ''
    if(user_uuid){
      params = `?user_uuid=${user_uuid}`
    }
    return this.http.get(`${this.configService.API_URL}/users/user-roles${params}`);
  }
  
  saveRole(role: any) {
    return this.http.post(`${this.configService.API_URL}/users/roles`, role);
  }
  
  deleteRole(role: any) {
    return this.http.delete(`${this.configService.API_URL}/users/roles`, {body: [role?.uuid]});
  }

  getPrivileges(){
    return this.http.get(`${this.configService.API_URL}/users/privileges`);
  }
  
  saveAssignment(roleAssignment: any) {
    return this.http.post(`${this.configService.API_URL}/users/assign-roles`, roleAssignment);
  }
  
}
