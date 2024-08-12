import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConnectionsService } from '../../modules/settings/services/connections.service';

@Injectable({
  providedIn: 'root',
})
export class SettingsGuard implements CanActivate {
  constructor(
    private connectionsService: ConnectionsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    if (state.url === '/settings') {
      return of(true); // Allow access to /settings without checking the config
    }

    return this.connectionsService.getOdkApiConfig(true).pipe(
      map((response) => {
        if (response.data) {
          return true;
        } else {
          this.snackBar.open(
            'Please configure the system settings first!',
            'Close',
            {
              horizontalPosition: 'end',
              verticalPosition: 'top',
              duration: 3000,
            }
          );
          this.router.navigate(['/settings']);
          return false; // Prevent access to the route
        }
      }),
      catchError(() => {
        this.snackBar.open(
          'Unable to verify system settings. Please try again later.',
          'Close',
          {
            horizontalPosition: 'end',
            verticalPosition: 'top',
            duration: 3000,
          }
        );
        this.router.navigate(['/settings']);
        return of(false); // Prevent access to the route
      })
    );
  }
}
