import { PreloadAllModules, RouterModule, Routes } from "@angular/router";
import { CoreComponent } from "./core.component";
import { NgModule } from "@angular/core";


const routes: Routes = [
  {
    path: '',
    // canActivate: [authGuard],
    component: CoreComponent,
    children: [
    ],
  },
//   {
//     path: "login",
//     component: LoginComponent,
//   },
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CoreRoutingModule {}