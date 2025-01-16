import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { authGuard } from 'app/shared/guards/auth.guard';
import { DataQualityComponent } from './data-quality.component';
import { DataCheckComponent } from './components/data-check/data-check.component';
import { ErrorListComponent } from './components/error-list/error-list.component';
import { DataCleanerComponent } from './components/data-cleaner/data-cleaner.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: DataQualityComponent,
    children: [
      {
        path: 'e',
        component: DataCheckComponent,
      },
      {
        path: '',
        component: ErrorListComponent,
      },
      {
        path: 'cleaner/:id',
        component: DataCleanerComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CcvaRoutingModule {
  constructor() {}
}
