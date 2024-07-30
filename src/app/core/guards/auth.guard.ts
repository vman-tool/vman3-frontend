import { CanActivateFn, Router, ActivatedRoute } from '@angular/router';
import { is_authenticated } from '../../shared/helpers/auth.helpers';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = async (route, state) => {
  const authenticated = await is_authenticated()
  
  // TODO: Get the current path and store it in a local storage so that we can use it later.
  // const current_route = inject(ActivatedRoute).

  if(!authenticated){
    inject(Router).navigate(['login'])
  }

  return authenticated ;
};
