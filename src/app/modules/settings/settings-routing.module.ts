import { SettingsComponent } from './settings.component';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { authGuard, PrivilegeGuard } from '../../shared/guards/auth.guard';
import { ConfigurationComponent } from './components/configuration/configuration.component';
import { DataSyncComponent } from './components/data-sync/data-sync.component';
import { UsersComponent } from './components/users/users.component';
import * as privileges  from 'app/shared/constants/privileges.constants';
import { PcvaSettingsComponent } from './components/pcva-settings/pcva-settings.component';
import { DataExportComponent } from './components/data-export/data-export.component';

const routes: Routes = [
  {
    path: '',

        component: SettingsComponent,
    canActivate: [authGuard, PrivilegeGuard],
    data: { requiredPrivilege: [privileges.SETTINGS_MODULE_VIEW]},
    children: [
      {
        path: '',
        redirectTo: 'configurations',
        pathMatch: 'full', // Ensures full match and redirects correctly
      },
      {
        path: 'configurations',
        component: ConfigurationComponent,
        canActivate: [PrivilegeGuard],
        data: { title: 'Configurations', requiredPrivilege: [privileges.SETTINGS_CONFIGS_VIEW]},
      },
      {
        path: 'sync',
        component: DataSyncComponent,
        canActivate: [PrivilegeGuard],
        data: { title: 'Synchronization', requiredPrivilege: [privileges.ODK_MODULE_VIEW]},
      },
      {
        path: 'users',
        component: UsersComponent,
        canActivate: [PrivilegeGuard],
        data: { title: 'Users', requiredPrivilege: [privileges.USERS_MODULE_VIEW]}
      },
      {
        path: 'pcva-configuration',
        component: PcvaSettingsComponent,
        canActivate: [PrivilegeGuard],
        data: { title: 'PCVA Configuration', requiredPrivilege: []}
      },
      {
        path: 'data-export',
        component: DataExportComponent,
        canActivate: [PrivilegeGuard],
        data: { title: 'Data Export', requiredPrivilege: [privileges.SETTINGS_DATA_EXPORT] }
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
