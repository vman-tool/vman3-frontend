import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";
import { authGuard } from "app/shared/guards/auth.guard";
import { DataQualityComponent } from "./data-quality.component";
import { DataCheckComponent } from "./components/data-check/data-check.component";


const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: DataQualityComponent,
    children: [
      {
        path: '',
        component: DataCheckComponent
      }
    ]
  },
  
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CcvaRoutingModule {
  constructor(){
  }
}