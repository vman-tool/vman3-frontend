import { CanActivateFn, Router } from '@angular/router';
import { is_authenticated } from '../helpers/auth.helpers';
import { inject } from '@angular/core';
import { AuthService } from '../../core/services/authentication/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router =  inject(Router)

  
  const latest_route = router.url
  localStorage.setItem("latest_route", latest_route)
  
  const authenticated =  await is_authenticated(authService)
  if(!authenticated){
    router.navigate(['login'])
  }
  return authenticated
};
