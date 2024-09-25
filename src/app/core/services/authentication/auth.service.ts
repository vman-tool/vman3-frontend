import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, mergeMap, of, tap} from 'rxjs';
import { ConfigService } from 'app/app.service';
import { ErrorEmitters } from 'app/core/emitters/error.emitters';
import { AuthEmitters } from 'app/core/emitters/auth.emitters';
import { IndexedDBService } from 'app/shared/services/indexedDB/indexed-db.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  error?: string;
  success?: boolean;
  cacheKey: string = "privileges"
  cachedPrivileges: string[] = [];

  constructor(
    private configService: ConfigService,
    private http?: HttpClient,
    private router?: Router,
    private indexedDBService?: IndexedDBService
  ) {
    ErrorEmitters.errorEmitter.subscribe((error: any) => {
      this.error = error
    })
    ErrorEmitters.successEmitter.subscribe(() => {
      this.success = true
    })
  }

  logout() {
    this.clearLocalStorage();
    localStorage.setItem("latest_route", this.router!.url)
    this.router!.navigate(['/login']);
  }

  login(username: string, password: string): Observable<any>{
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    const formData = new HttpParams()
      .set('username', username)
      .set('password', password);
    return this.http!.post(`${this.configService.API_URL}/auth/login`, formData, {headers: headers, withCredentials: true}).pipe(
      map((response: any) => {
        if(this.success){
          this.saveUserData(response)
        }
        return response
      }),
      catchError((error: any) => {
        console.log("Error: ", error)
        return of(error);
      })
    )
  }
  
  change_password(old_password: string, new_password: string): Observable<any>{
    const data = {
      "old_password": old_password,
      "new_password": new_password
    }
    let formData = new FormData();
    formData.append("data", JSON.stringify(data))
    return this.http!.post(`${this.configService.API_URL}/auth/change-password`, formData)
  }
  
  refresh_token(): Observable<any>{
    const refresh_token = localStorage.getItem("refresh_token")!

    const headers = new HttpHeaders({
      'refresh-token': refresh_token
    });

    return this.http!.post(
      `${this.configService.API_URL}/auth/refresh`, null, { headers }
    )
  }

  get_user(): Observable<any> {
    return this.http!.get(`${this.configService.API_URL}/users/me`).pipe(
      mergeMap((response: any) => {
        localStorage.setItem("current_user", JSON.stringify(response))
        return of(response)
      }),
      catchError((error: any) => {
        return of(error)
      })
    )
  }

   getUserPrivileges(): Observable<any> {
    const cached = localStorage.getItem(this.cacheKey);
    if (cached) {
      this.cachedPrivileges = JSON.parse(cached);
      return of(this.cachedPrivileges);
    }
    
    return this.http!.get(`${this.configService.API_URL}/users/roles`).pipe(
      map((response: any) => {
        if(response?.data?.length){
          for(const role of response?.data) {
            console.log(role.privileges)
            this.cachedPrivileges = [
              ...this.cachedPrivileges,
              ...role?.privileges
            ]
          }
          localStorage.setItem(this.cacheKey, JSON.stringify(this.cachedPrivileges));
        }
        return this.cachedPrivileges;
      }),
      catchError((error) => {
        console.error('Error fetching privileges', error);
        return of([]);
      })
    );
  }

  hasPrivilege(requiredPrivilege: string[]): Observable<boolean> {
    return this.getUserPrivileges().pipe(
      map((privileges: string[]) => requiredPrivilege.every(requiredPrivilege => privileges.includes(requiredPrivilege)))
    )
  }
  clearPrivilegeCache(): void {
    localStorage.removeItem(this.cacheKey);
    this.cachedPrivileges = [];
  }

  saveUserData(response: any) {
    this.clearUserData()

    localStorage.setItem("access_token", response?.access_token)
    localStorage.setItem("refresh_token", response?.refresh_token)
    
    const now = new Date().getTime()/1000;
    let expiry_timestamp_array = (now + Number(response.expires_in)).toString()?.split(".")
    expiry_timestamp_array[1] = expiry_timestamp_array[1]?.length === 2 ? expiry_timestamp_array[1]+"0" : expiry_timestamp_array[1]?.length === 1 ? expiry_timestamp_array[1]+"00" : expiry_timestamp_array[1]

    const expiry_timestamp_string = expiry_timestamp_array.join(".")

    


    localStorage.setItem("access_token_expiry", expiry_timestamp_string)
    localStorage.setItem("current_user", JSON.stringify(response.user))
    AuthEmitters.authEmitter.emit(true);
  }
  
  clearUserData() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("access_token_expiry");
    localStorage.removeItem("current_user");
    this.clearPrivilegeCache();
  }
  
  clearLocalStorage() {
    localStorage.clear();
    this.indexedDBService?.deleteDatabase("vmanDB");
  }
}