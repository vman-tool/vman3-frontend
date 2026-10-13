import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { authGuard } from '../../shared/guards/auth.guard';
import { MapsComponent } from './maps.component';
import { MapDataComponent } from './components/map-data/map-data.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: MapsComponent,
    children: [
      {
        path: '',
        component: MapDataComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MapsRoutingModule {
  constructor() {}
}
