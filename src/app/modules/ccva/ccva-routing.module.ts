import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";
import { authGuard } from "app/shared/guards/auth.guard";
import { CcvaComponent } from "./ccva.component";
import { RunCcvaComponent } from "./components/run-ccva/run-ccva.component";


const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: CcvaComponent,
    children: [
      {
        path: '',
        component: RunCcvaComponent
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