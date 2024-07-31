import { CanActivateFn, Router } from '@angular/router';
import { is_authenticated } from '../../shared/helpers/auth.helpers';
import { inject } from '@angular/core';
import { AuthService } from '../services/authentication/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router =  inject(Router)

  
  const current_route = router.url
  localStorage.setItem('current_route', current_route)
  
  const authenticated =  await is_authenticated(authService)
  if(!authenticated){
    router.navigate(['login'])
  }
  return authenticated
};
