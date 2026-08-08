import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";
import { PcvaComponent } from "./pcva.component";
import { authGuard } from "../../shared/guards/auth.guard";
import { CodedVaComponent } from "./components/coded-va/coded-va.component";
import { DiscordantsVaComponent } from "./components/discordants-va/discordants-va.component";
import { AllAssignedComponent } from "./components/all-assigned/all-assigned.component";
import { CodersComponent } from "./components/coders/coders.component";
import { ConcordantVaComponent } from './components/concordant-va/concordant-va.component';
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
        data: { title: 'Coders' },
        component: CodersComponent,
      },
      {
        // PCVA All Assigned Component
        path: 'coders',
        data: { title: 'Coders' },
        component: CodersComponent,
      },
      {
        // PCVA All Assigned Component
        path: 'all-assigned',
        data: { title: 'Assigned VA' },
        component: AllAssignedComponent,
      },
      {
        // PCVA Coded VA Component
        path: 'coded-va',
        data: { title: 'Coded VA' },
        component: CodedVaComponent
      },
      {
        // PCVA Discordants Component
        path: 'discordants',
        data: { title: 'Discordant' },
        component: DiscordantsVaComponent
      },
      {
        path: 'concordant-va',
        data: { title: 'Concordant VA' },
        component: ConcordantVaComponent,
      },
      {
        // PCVA Resuls Component
        path: 'pcva-results',
        data: { title: 'Data Export' },
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