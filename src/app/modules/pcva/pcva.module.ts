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
import { ViewVaComponent } from '../../shared/dialogs/view-va/view-va.component';
import { CodeVaComponent } from './dialogs/code-va/code-va.component';
import { CodingSheetComponent } from './components/coding-sheet/coding-sheet.component';
import { FormsModule } from '@angular/forms';
import { PcvaResultsComponent } from './components/pcva-results/pcva-results.component';
import { UnassignVaComponent } from './dialogs/unassign-va/unassign-va.component';



@NgModule({
  declarations: [
    PcvaComponent,
    AllAssignedComponent,
    CodedVaComponent,
    DiscordantsVaComponent,
    CodersComponent,
    AssignVaComponent,
    ViewVaComponent,
    CodeVaComponent,
    CodingSheetComponent,
    PcvaResultsComponent,
    UnassignVaComponent
  ],
  imports: [
    CommonModule,
    PcvaRoutingModule,
    SharedModule,
    MaterialModule,
    FormsModule
  ],
  exports: [
    PcvaComponent
  ]
})
export class PcvaModule {}
