import { RouterModule, Routes } from '@angular/router';
import { CoreComponent } from './core.component';
import { NgModule } from '@angular/core';
import { LoginComponent } from './components/login/login.component';
import { authGuard, PrivilegeGuard } from '../shared/guards/auth.guard';
import { SettingsGuard } from '../shared/guards/system-config.guard';
import * as privileges  from 'app/shared/constants/privileges.constants';

const routes: Routes = [
  {
    path: '',

    canActivate: [authGuard, SettingsGuard],

    component: CoreComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        // PCVA module
        path: 'pcva',
        loadChildren: () =>
          import('../modules/pcva/pcva.module').then(
            (importation) => importation.PcvaModule
          ),
        canActivate: [SettingsGuard, PrivilegeGuard],
        data: { requiredPrivilege: [privileges.PCVA_MODULE_ACCESS]} 
      },
      {
        // Records module
        path: 'records',
        loadChildren: () =>
          import('../modules/records/records.module').then(
            (importation) => importation.RecordsModule
          ),
        canActivate: [SettingsGuard],
      },
      {
        // Records module
        path: 'data-quality',
        loadChildren: () =>
          import('../modules/data-quality/data-quality.module').then(
            (importation) => importation.DataQualityModule
          ),
        canActivate: [SettingsGuard],
      },
      {
        // Map module
        path: 'data-map',
        loadChildren: () =>
          import('../modules/maps/maps.module').then(
            (importation) => importation.MapsModule
          ),
        canActivate: [SettingsGuard],
      },
      {
        // Map module
        path: 'settings',
        loadChildren: () =>
          import('../modules/settings/settings.module').then(
            (importation) => importation.SettingsModule
          ), 
      },
      {
        // dashboard module
        path: 'dashboard',
        loadChildren: () =>
          import('../modules/dashboard/dashboard.module').then(
            (importation) => importation.DashboardModule
          ),
        canActivate: [SettingsGuard],
      },
      {
        // dashboard module
        path: 'ccva',
        loadChildren: () =>
          import('../modules/ccva/ccva.module').then(
            (importation) => importation.CcvaModule
          )
      },
    ],
  },
  {
    path: 'login',
    component: LoginComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CoreRoutingModule {}
