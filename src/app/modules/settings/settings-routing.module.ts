import { SettingsComponent } from './settings.component';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { authGuard, PrivilegeGuard } from '../../shared/guards/auth.guard';
import { ConfigurationComponent } from './components/configuration/configuration.component';
import { DataSyncComponent } from './components/data-sync/data-sync.component';
import { UsersComponent } from './components/users/users.component';
import * as privileges  from 'app/shared/constants/privileges.constants';

const routes: Routes = [
  {
    path: '',

    canActivate: [authGuard],
    component: SettingsComponent,
    children: [
      {
        path: '',
        redirectTo: 'configurations',
        pathMatch: 'full', // Ensures full match and redirects correctly
      },
      {
        path: 'configurations',

        component: ConfigurationComponent,
      },
      {
        path: 'sync',
        component: DataSyncComponent,
      },
      {
        path: 'users',
        component: UsersComponent,
        canActivate: [PrivilegeGuard],
        data: { requiredPrivilege: [privileges.USERS_MODULE_VIEW]}
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {
  constructor() {}
}
