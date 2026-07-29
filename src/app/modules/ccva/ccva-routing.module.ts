import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { authGuard } from 'app/shared/guards/auth.guard';
import { CcvaComponent } from './ccva.component';
import { RunCcvaComponent } from './components/run-ccva/run-ccva.component';
import { ListCcvaComponent } from './components/list-ccva/list-ccva.component';
import { ViewCcvaComponent } from './components/view-ccva/view-ccva.component';
import { CompareCcvaComponent } from './components/compare-ccva/compare-ccva.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: CcvaComponent,
    children: [
      { path: 'view',           component: RunCcvaComponent },
      { path: 'view/:id',       component: ViewCcvaComponent },
      { path: 'compare/:id1/:id2', component: CompareCcvaComponent },
      { path: '',               component: ListCcvaComponent },
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
