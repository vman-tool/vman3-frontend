import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { authGuard } from 'app/shared/guards/auth.guard';
import { DataQualityComponent } from './data-quality.component';
import { DataCheckComponent } from './components/data-check/data-check.component';
import { ErrorListComponent } from './components/error-list/error-list.component';
import { DataCleanerComponent } from './components/data-cleaner/data-cleaner.component';
import { MainErrorComponent } from './components/main/main.component';
import { GeneralDqaComponent } from './components/general-dqa/general-dqa.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: DataQualityComponent,
    children: [
      { path: '', redirectTo: 'sub-item-1', pathMatch: 'full' },
      {
        path: 'sub-item-1',
        component: GeneralDqaComponent,
      },
      {
        path: 'sub-item-2',
        component: MainErrorComponent,
        children: [
          { path: 'errors', component: ErrorListComponent },
        ],
      },
      { path: 'e', component: DataCheckComponent },
      { path: 'cleaner/:id', component: DataCleanerComponent },
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
