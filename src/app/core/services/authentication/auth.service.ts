import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { Observable, catchError, map, mergeMap, of} from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { ErrorEmitters } from '../../emitters/error.emitters';
import { environment } from '../../../environments/environment';
import { AuthEmitters } from '../../emitters/auth.emitters';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  error?: string;
  success?: boolean;
  API_URL: string = environment.API_URL

  constructor(
    private http?: HttpClient,
    private cookieService?: CookieService,
    private router?: Router,
  ) { 
    ErrorEmitters.errorEmitter.subscribe((error: any) => {
      this.error = error
    })
    ErrorEmitters.successEmitter.subscribe(() => {
      this.success = true
    })
  }

  logout() {
    this.cookieService!.delete("csrftoken");
    this.clearLocalStorage();
    this.router!.navigate(['/login']);
  }

  login(username: string, password: string): Observable<any>{
    const headers = new HttpHeaders();
    const formData = new HttpParams()
      .set('username', username)
      .set('password', password);
    
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    return this.http!.post(`${this.API_URL}/accounts/login/`, formData, {headers: headers})
  }
  
  change_password(old_password: string, new_password: string): Observable<any>{
    const data = {
      "old_password": old_password,
      "new_password": new_password
    }
    let formData = new FormData();
    formData.append("data", JSON.stringify(data))
    return this.http!.post(`${this.API_URL}/accounts/change-password/`, formData)
  }
  
  get_superuser_status(): Observable<any>{
    return this.http!.get(`${this.API_URL}/accounts/check-super-user/`)
  }

  request_token(username: string, password: string): Observable<any>{
    const headers = new HttpHeaders();
    const userObject = {
      username: username,
      password: password
    }

    return this.http!.post(`${this.API_URL}/token/`, userObject, { headers: headers })
    .pipe(
      map((response: any) => {
        if(this.success){
          this.saveUserData(response)
          this.router!.navigate(['/']);
        }
        return response
      }),
      catchError((error: any) => {
        console.log("Error: ", error)
        return of(error);
      })
    )
  }
  
  refresh_token(): Observable<any>{
    const refreshObject = {
      refresh: localStorage.getItem("refresh_token")
    }
    return this.http!.post(`${this.API_URL}/token/refresh/`, refreshObject).pipe(
      mergeMap((response: any) => {
        return response
      }),
      catchError((error: any) => {
        return of(error)
      })
    )
  }

  get_user(): Observable<any> {
    return this.http!.get(`${this.API_URL}/accounts/current-user/`).pipe(
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
    localStorage.setItem("access_token", response?.access)
    localStorage.setItem("refresh_token", response?.refresh)

    const access_details: any = jwtDecode(response.access)
    const refresh_details: any = jwtDecode(response.refresh)

    console.log("Access Details", access_details)
    console.log("Refresh Details", refresh_details)
    
    // localStorage.setItem("access_token_expiry", String(access_details?.exp))
    // localStorage.setItem("refresh_token_expiry", String(refresh_details?.exp))
    // localStorage.setItem("user_details", JSON.stringify(access_details))
    // this.get_user().subscribe({
    //   next: () => {
    //     AuthEmitters.authEmitter.emit(true)
    //   }
    // });
  }
  
  clearUserData() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("access_token_expiry");
    localStorage.removeItem("refresh_token_expiry");
    localStorage.removeItem("user_details")
    localStorage.removeItem("current_user");
  }
  
  clearLocalStorage() {
    localStorage.clear();
  }
}