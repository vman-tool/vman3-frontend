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

import { settingsConfigData } from '../../modules/settings/interface';
import { SettingConfigService } from '../../modules/settings/services/settings_configs.service';

@Injectable({
  providedIn: 'root',
})
export class SettingsGuard implements CanActivate {
  constructor(
    private settingsConfigsService: SettingConfigService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    if (state.url.includes('/settings')) {
      return of(true); // Allow access to /settings without checking the config
    }

    return this.settingsConfigsService.getSettingsConfig(true).pipe(
      map((config: settingsConfigData | null) => {
        if (config && Object.keys(config.odk_api_configs).length && Object.keys(config.odk_api_configs).length && Object.keys(config.field_mapping).length) {
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
