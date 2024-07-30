import { CanActivateFn, Router } from '@angular/router';
import { is_authenticated } from '../../shared/helpers/auth.helpers';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = async (route, state) => {
  const authenticated = await is_authenticated()
  
  if(!authenticated){
    inject(Router).navigate(['login'])
  }

  return authenticated ;
};
