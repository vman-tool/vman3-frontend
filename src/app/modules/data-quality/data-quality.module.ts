import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CcvaRoutingModule } from './data-quality-routing.module';
import { DataQualityComponent } from './data-quality.component';
import { BaseChartDirective } from 'ng2-charts';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { DataCheckComponent } from './components/data-check/data-check.component';

@NgModule({
  declarations: [DataQualityComponent, DataCheckComponent],
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
export class DataQualityModule {}
