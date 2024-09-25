import { ActivatedRouteSnapshot, CanActivate, CanActivateFn, Router } from '@angular/router';
import { is_authenticated } from '../helpers/auth.helpers';
import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../core/services/authentication/auth.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { lastValueFrom } from 'rxjs';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router =  inject(Router)
  
  const authenticated =  await is_authenticated(authService)
  if(!authenticated){
    router.navigate(['login'])
  }
  return authenticated
};

@Injectable({
  providedIn: 'root'
})
export class PrivilegeGuard implements CanActivate {
  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const requiredPrivilege = route.data['requiredPrivilege'];
    const hasPrivileges = await lastValueFrom(this.authService.hasPrivilege(requiredPrivilege))
    if (hasPrivileges) {
      return true;
    }
    this.snackBar.open("You don't have permission to access this page", "close", {
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      duration: 3 * 1000,
    });
    return false;
  }
}
