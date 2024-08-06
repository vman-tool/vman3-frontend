import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapDataComponent } from './components/map-data/map-data.component';
import { MapsComponent } from './maps.component';
import { MapsRoutingModule } from './maps-routing.module';
import { MaterialModule } from '../../material/material.module';
import { SharedModule } from '../../shared/shared.module';
import { VaFiltersComponent } from '../../shared/dialogs/filters/va-filters/va-filters.component';

@NgModule({
  declarations: [MapDataComponent, MapsComponent],
  imports: [
    CommonModule,
    MapsRoutingModule,
    SharedModule,
    // NgMapsCoreModule.forRoot({
    //   apiKey: 'AIzaSyAQUxKbZ-rKt82cerlkp_GXSuWfXTmm5Hc', // Replace with your API key
    // }),
    VaFiltersComponent,
    MaterialModule,
  ],
})
export class MapsModule {}
