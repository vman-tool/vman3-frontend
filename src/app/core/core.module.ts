import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreComponent } from './core.component';
import { CoreRoutingModule } from './core-routing.module';
import { SharedModule } from '../shared/shared.module';
import { BodyComponent } from './containers/body/body.component';
import { HeaderComponent } from './containers/header/header.component';
import { FooterComponent } from './containers/footer/footer.component';
import { MaterialModule } from '../material/material.module';



@NgModule({
  declarations: [
    CoreComponent,
    HeaderComponent,
    BodyComponent,
    FooterComponent,
  ],
  imports: [
    CommonModule,
    CoreRoutingModule,
    MaterialModule,
    SharedModule
  ],
  exports: [
    CoreComponent
  ]
})
export class CoreModule { }
