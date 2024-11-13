import { HttpErrorResponse, HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { AuthService } from '../services/authentication/auth.service';
import { ErrorEmitters } from '../emitters/error.emitters';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class CsrfInterceptorService {

  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  refresh: boolean = Boolean(localStorage.getItem('refresh_request'));

  
  intercept(request: HttpRequest<any>, next: HttpHandler) {
    localStorage.setItem("latest_route", this.router!.url)
    
    let modifiedRequest = this.addHeaders(request);

    return next.handle(modifiedRequest).pipe(
      catchError((requestError: HttpErrorResponse) => {
        if (requestError.status === 401) {
          localStorage.setItem('refresh_request', String(true))
          if(!this.refresh){
            console.log("Refresh-Response: ", requestError.status)
            this.refresh = Boolean(localStorage.getItem('refresh_request'));
            return this.authService.refresh_token().pipe(
              map((response) => {
                if (response.status === 200) {
                  localStorage.removeItem('refresh_request')
                  console.log("refresh called in intercetor and succeeded!",)
                  this.authService.saveUserData(response);
                  modifiedRequest = this.addHeaders(request);
                  return next.handle(modifiedRequest);
                } else {
                  console.log("refresh called in intercetor and failed!")
                  localStorage.removeItem('refresh_request')
                  this.authService.logout();
                  return throwError(() => requestError);
                }
              }),
              catchError((error) => {
                console.log("Error occured in refresh interceptor... ")
                localStorage.removeItem('refresh_request')
                this.authService.logout();
                return throwError(() => error);
              })
            );
          }
          else {
            console.log("refresh called more than one time!")
            this.authService.logout();
            return throwError(() => requestError);
          }
        }
        if(!requestError.status){
          console.log("Connection error: ")
        }
        return throwError(() => requestError);
      }),
      map((response: any) => {
        ErrorEmitters.successEmitter.emit();
        return response;
      })
    );
  }


  addHeaders(request: HttpRequest<any>): HttpRequest<any> {
    const access_token = localStorage.getItem('access_token');
    const authHeader = 'Authorization';
    let headers = request.headers;

    if (!request.url.includes('auth/refresh')) {
      headers = access_token ? headers.set(authHeader, `Bearer ${access_token}`) : headers;
    }
    return request.clone({
      headers,
      withCredentials: true
    });
  }
}
