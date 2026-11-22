import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material/material.module';
import { SharedModule } from '../../shared/shared.module';
import { RecordsRoutingModule } from './records-routing.module';

import { RecordsComponent } from './records.component';
import { ListRecordsComponent } from './components/list-records/list-records.component';
import { VaRecordMapViewComponent } from './components/va-record-map-view/va-record-map-view.component';
import { FormsModule } from '@angular/forms';
import { DataFilterComponent } from '../../shared/dialogs/filters/data-filter/data-filter/data-filter.component';
import { VaFiltersComponent } from '../../shared/dialogs/filters/va-filters/va-filters.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CustomDropdownComponent } from '../../shared/components/custom-dropdown/custom-dropdown.component';
import { CopyableIdComponent } from '../../shared/components/copyable-id/copyable-id.component';
import { BaseChartDirective } from 'ng2-charts';

@NgModule({
  declarations: [
    RecordsComponent,
    ListRecordsComponent,
    VaRecordMapViewComponent,
    DataFilterComponent,
    // VaFiltersComponent,
  ],
  imports: [
    CommonModule,
    RecordsRoutingModule,
    SharedModule,
    FormsModule,
    MaterialModule,
    MatProgressSpinnerModule,
    VaFiltersComponent,
    CustomDropdownComponent,
    CopyableIdComponent,
    BaseChartDirective,
  ],
  exports: [RecordsComponent],
})
export class RecordsModule {}
