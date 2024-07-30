import { HttpErrorResponse, HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Observable, catchError, map, mergeMap, of } from 'rxjs';
import { 
  MatSnackBarHorizontalPosition, 
  MatSnackBarVerticalPosition 
} from '@angular/material/snack-bar';
import { AuthService } from '../services/authentication/auth.service';
import { ErrorEmitters } from '../emitters/error.emitters';


@Injectable({
  providedIn: 'root'
})
export class CsrfInterceptorService {

  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    private cookieService: CookieService,
    private authService: AuthService,
  ) { }

  refresh: boolean = true;

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> | Observable<any> | any {
    const now = new Date().getTime()/1000;
    const refresh_token_time = localStorage.getItem('refresh_token_expiry');

    let modifiedRequest = this.addHeaders(request)
    if (now > Number(refresh_token_time)) {
      this.authService.logout();
    }

    return next.handle(modifiedRequest).pipe(
      catchError((requestError: HttpErrorResponse): Observable<any> => {
        if ((requestError.status === 401 || requestError.status === 403) && refresh_token_time && now < Number(refresh_token_time)){
          return this.authService.refresh_token().pipe(
            mergeMap((response) => {
              this.authService.clearUserData()
              setTimeout(() => {
                this.authService.saveUserData(response)
              }, 100)
              return next.handle(this.addHeaders(modifiedRequest))
            })
          )
        }
        
        if (refresh_token_time && now > Number(refresh_token_time)){
          this.authService.logout();
        }
        const errorMessage = requestError?.error?.message ? requestError?.error?.message : 
          requestError?.error?.error ? requestError?.error?.error :
            requestError?.error?.detail ? requestError?.error?.detail : requestError?.message
        ErrorEmitters.errorEmitter.emit(errorMessage);
        return of(requestError);
      }),
      map((response: any) => {
        ErrorEmitters.successEmitter.emit(response?.body?.message || response?.statusText);
        return response;
      })
    );
  }

  addHeaders(request: HttpRequest<any>): HttpRequest<any> {
    const csrfToken = this.cookieService.get('csrftoken');
    const access_token = localStorage.getItem('access_token');
    const csrfHeader = 'X-CSRFToken';
    const authHeader = 'Authorization';

    let headers : any = {
      [csrfHeader]: csrfToken,
    }
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