import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";
import { PcvaComponent } from "./pcva.component";
import { authGuard } from "../../shared/guards/auth.guard";
import { CodedVaComponent } from "./components/coded-va/coded-va.component";
import { DiscordantsVaComponent } from "./components/discordants-va/discordants-va.component";
import { AllAssignedComponent } from "./components/all-assigned/all-assigned.component";
import { CodersComponent } from "./components/coders/coders.component";
import { PcvaResultsComponent } from "./components/pcva-results/pcva-results.component";


const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: PcvaComponent,
    children: [
      {
        // PCVA All Assigned Component
        path: '',
        component: CodersComponent,
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
      {
        // PCVA Resuls Component
        path: 'pcva-results',
        component: PcvaResultsComponent
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