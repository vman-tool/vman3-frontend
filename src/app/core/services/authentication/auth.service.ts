import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, mergeMap, of} from 'rxjs';
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

  saveUserData(response: any) {
    this.clearUserData()

    localStorage.setItem("access_token", response?.access_token)
    localStorage.setItem("refresh_token", response?.refresh_token)
    
     const now = new Date().getTime()/1000;

    localStorage.setItem("access_token_expiry", (now + Number(response.expires_in)).toString())
    localStorage.setItem("current_user", JSON.stringify(response.user))
    AuthEmitters.authEmitter.emit(true);
  }
  
  clearUserData() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("access_token_expiry");
    localStorage.removeItem("current_user");
  }
  
  clearLocalStorage() {
    localStorage.clear();
    this.indexedDBService?.deleteDatabase("vmanDB");
  }
}