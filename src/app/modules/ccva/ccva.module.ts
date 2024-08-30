import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CcvaRoutingModule } from './ccva-routing.module';
import { RunCcvaComponent } from './components/run-ccva/run-ccva.component';
import { CcvaComponent } from './ccva.component';



@NgModule({
  declarations: [
    RunCcvaComponent,
    CcvaComponent
  ],
  imports: [
    CommonModule,
    CcvaRoutingModule
  ]
})
export class CcvaModule { }
