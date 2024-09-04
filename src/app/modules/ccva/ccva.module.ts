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

@NgModule({
  declarations: [RunCcvaComponent, CcvaComponent, CcvaGraphsComponent],
  imports: [
    CommonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    FormsModule,
    MatInputModule,
    BaseChartDirective,
    CcvaRoutingModule,
  ],
})
export class CcvaModule {}
