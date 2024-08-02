import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material/material.module';
import { SharedModule } from '../../shared/shared.module';
import { RecordsRoutingModule } from './records-routing.module';

import { RecordsComponent } from './records.component';
import { ListRecordsComponent } from './components/list-records/list-records.component';
import { FormsModule } from '@angular/forms';
import { DataFilterComponent } from './dialogs/data-filter/data-filter/data-filter.component';

@NgModule({
  declarations: [RecordsComponent, ListRecordsComponent, DataFilterComponent],
  imports: [
    CommonModule,
    RecordsRoutingModule,
    SharedModule,
    FormsModule,
    MaterialModule,
  ],
  exports: [RecordsComponent],
})
export class RecordsModule {}
