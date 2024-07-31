import { HttpErrorResponse, HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, mergeMap, of } from 'rxjs';
import { 
  MatSnackBarHorizontalPosition, 
  MatSnackBarVerticalPosition 
} from '@angular/material/snack-bar';
import { AuthService } from '../services/authentication/auth.service';
import { ErrorEmitters } from '../emitters/error.emitters';
import { Router } from '@angular/router';
import { AuthEmitters } from '../emitters/auth.emitters';


@Injectable({
  providedIn: 'root'
})
export class CsrfInterceptorService {

  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    private authService: AuthService
  ) { }

  refresh: boolean = true;

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> | Observable<any> | any {
    const now = new Date().getTime()/1000;
    const access_token_expiry = localStorage.getItem('access_token_expiry')!

    let modifiedRequest = this.addHeaders(request)

    return next.handle(modifiedRequest).pipe(
      catchError(async (requestError: HttpErrorResponse): Promise<Observable<any>> => {
        if ((requestError.status === 401 || requestError.status === 403)){
          return this.authService.refresh_token().pipe(
            mergeMap((response) => {
              this.authService.saveUserData(response)
              return next.handle(this.addHeaders(modifiedRequest))
            }),
            catchError((error) => {
              console.log("Refresh retry")
              this.authService.logout()
              return of(error)
            })
          )
        }
        return of(requestError);
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
    
    let headers : any;
    headers = access_token ? {
      ...headers,
      [authHeader] : `Bearer ${access_token}`
    } : headers

    return request.clone({
      setHeaders: headers,
      withCredentials: true
    });
  }
}