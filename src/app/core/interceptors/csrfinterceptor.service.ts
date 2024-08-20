import { HttpErrorResponse, HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';
import { MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { AuthService } from '../services/authentication/auth.service';
import { ErrorEmitters } from '../emitters/error.emitters';
import { Router } from '@angular/router';
import { AuthEmitters } from '../emitters/auth.emitters';
import { is_authenticated } from '../../shared/helpers/auth.helpers';

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

  refresh: boolean = true;
  refreshRequests: number = 0;

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const now = new Date().getTime() / 1000;
    const access_token_expiry = localStorage.getItem('access_token_expiry');

    let modifiedRequest = this.addHeaders(request);

    return next.handle(modifiedRequest).pipe(
      catchError(async (requestError: HttpErrorResponse) => {
        if (requestError.status === 401 || requestError.status === 403) {
          if(this.refreshRequests < 1){

            localStorage.setItem("latest_route", this.router!.url)
            return this.authService.refresh_token().pipe(
              map((response) => {
                this.refreshRequests++
                console.log("Refresh-Response: ", response)
                if (response.status === 200) {
                  console.log("refresh called in intercetor and succeeded!",)
                  this.authService.saveUserData(response);
                  modifiedRequest = this.addHeaders(request); // Update the headers with the new token
                  return next.handle(modifiedRequest);
                } else {
                  console.log("refresh called in intercetor and failed!")
                  this.authService.logout();
                  return throwError(() => requestError);
                }
              }),
              catchError((error) => {
                this.refreshRequests++
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
