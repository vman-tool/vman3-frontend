import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";
import { authGuard } from "app/shared/guards/auth.guard";
import { CcvaComponent } from "./ccva.component";


const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: CcvaComponent
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