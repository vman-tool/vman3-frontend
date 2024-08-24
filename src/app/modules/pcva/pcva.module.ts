import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { MaterialModule } from '../../material/material.module';
import { PcvaComponent } from './pcva.component';
import { PcvaRoutingModule } from './pcva-routing.module';
import { AllAssignedComponent } from './components/all-assigned/all-assigned.component';
import { CodedVaComponent } from './components/coded-va/coded-va.component';
import { DiscordantsVaComponent } from './components/discordants-va/discordants-va.component';
import { CodersComponent } from './components/coders/coders.component';
import { AssignVaComponent } from './dialogs/assign-va/assign-va.component';
import { ViewVaComponent } from './dialogs/view-va/view-va.component';
import { CodeVaComponent } from './dialogs/code-va/code-va.component';



@NgModule({
  declarations: [
    PcvaComponent,
    AllAssignedComponent,
    CodedVaComponent,
    DiscordantsVaComponent,
    CodersComponent,
    AssignVaComponent,
    ViewVaComponent,
    CodeVaComponent
  ],
  imports: [
    CommonModule,
    PcvaRoutingModule,
    SharedModule,
    MaterialModule
  ],
  exports: [
    PcvaComponent
  ]
})
export class PcvaModule {}
