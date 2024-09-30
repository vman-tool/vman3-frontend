import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CcvaRoutingModule } from './ccva-routing.module';
import { RunCcvaComponent } from './components/run-ccva/run-ccva.component';
import { CcvaComponent } from './ccva.component';
import { CcvaGraphsComponent } from './components/ccva-graphs/ccva-graphs.component';
import { BaseChartDirective } from 'ng2-charts';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { ListCcvaComponent } from './components/list-ccva/list-ccva.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VaFiltersComponent } from '../../shared/dialogs/filters/va-filters/va-filters.component';
import { ViewCcvaComponent } from './components/view-ccva/view-ccva.component';

@NgModule({
  declarations: [
    RunCcvaComponent,
    CcvaComponent,
    ListCcvaComponent,
    CcvaGraphsComponent,
    ViewCcvaComponent,
  ],
  imports: [
    CommonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatInputModule,
    BaseChartDirective,
    CcvaRoutingModule,
    VaFiltersComponent,
  ],
  // exports: [CcvaGraphsComponent],
})
export class CcvaModule {}
