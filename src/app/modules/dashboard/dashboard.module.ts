import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { BaseChartDirective } from 'ng2-charts';
import { GraphsComponent } from './components/graphs/graphs.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { MaterialModule } from '../../material/material.module';
import { SharedModule } from '../../shared/shared.module';
import { SubmissionsComponent } from './components/submissions/submissions.component';
import { VaFiltersComponent } from '../../shared/dialogs/filters/va-filters/va-filters.component';
import { CcvaDashboardGraphsComponent } from './components/ccva-dashboard-graphs/ccva-graphs.component';

@NgModule({
  declarations: [
    DashboardComponent,
    GraphsComponent,
    SubmissionsComponent,
    CcvaDashboardGraphsComponent,
  ],
  imports: [
    CommonModule,
    BaseChartDirective,
    DashboardRoutingModule,
    SharedModule,
    MaterialModule,
    VaFiltersComponent,
    // EchartGraphComponent,
  ],
})
export class DashboardModule {}
