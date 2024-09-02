import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CcvaRoutingModule } from './ccva-routing.module';
import { RunCcvaComponent } from './components/run-ccva/run-ccva.component';
import { CcvaComponent } from './ccva.component';
import { CcvaGraphsComponent } from './components/ccva-graphs/ccva-graphs.component';
import { BaseChartDirective } from 'ng2-charts';

@NgModule({
  declarations: [RunCcvaComponent, CcvaComponent, CcvaGraphsComponent],
  imports: [CommonModule, BaseChartDirective, CcvaRoutingModule],
})
export class CcvaModule {}
