import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { authGuard } from '../../shared/guards/auth.guard';
import { ListRecordsComponent } from './components/list-records/list-records.component';
import { RecordsComponent } from './records.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: RecordsComponent,
    children: [
      { path: '', redirectTo: 'table-1', pathMatch: 'full' },
      { path: 'table-1', component: ListRecordsComponent, data: { mode: 'cause' } },
      { path: 'table-2', component: ListRecordsComponent, data: { mode: 'dqa' } },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RecordsRoutingModule {
  constructor() {}
}
