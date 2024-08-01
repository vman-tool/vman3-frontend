import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";
import { PcvaComponent } from "./pcva.component";
import { authGuard } from "../../shared/guards/auth.guard";
import { CodedVaComponent } from "./components/coded-va/coded-va.component";
import { DiscordantsVaComponent } from "./components/discordants-va/discordants-va.component";
import { AllAssignedComponent } from "./components/all-assigned/all-assigned.component";
import { CodersComponent } from "./components/coders/coders.component";
import { DoctorsComponent } from "./components/doctors/doctors.component";


const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: PcvaComponent,
    children: [
      {
        // PCVA All Assigned Component
        path: '',
        component: DoctorsComponent,
      },
      {
        // PCVA All Doctors
        path: 'doctors',
        component: DoctorsComponent,
      },
      {
        // PCVA All Assigned Component
        path: 'coders',
        component: CodersComponent,
      },
      {
        // PCVA All Assigned Component
        path: 'all-assigned',
        component: AllAssignedComponent,
      },
      {
        // PCVA Coded VA Component
        path: 'coded-va',
        component: CodedVaComponent
      },
      {
        // PCVA Discordants Component
        path: 'discordants',
        component: DiscordantsVaComponent
      },
    ]
  },
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PcvaRoutingModule {
  constructor(){
  }
}