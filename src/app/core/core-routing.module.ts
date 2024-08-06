import { RouterModule, Routes } from '@angular/router';
import { CoreComponent } from './core.component';
import { NgModule } from '@angular/core';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from '../shared/guards/auth.guard';

const routes: Routes = [
  {
    path: '',

    canActivate: [authGuard],

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
      },
      {
        // PCVA module
        path: 'records',
        loadChildren: () =>
          import('../modules/records/records.module').then(
            (importation) => importation.RecordsModule
          ),
      },
      {
        // PCVA module
        path: 'dashboard',
        loadChildren: () =>
          import('../modules/dashboard/dashboard.module').then(
            (importation) => importation.DashboardModule
          ),
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
