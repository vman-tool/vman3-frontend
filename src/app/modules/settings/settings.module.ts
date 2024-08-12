import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectionsComponent } from './components/connections/connections.component';
import { UsersComponent } from './components/users/users.component';
import { MaterialModule } from '../../material/material.module';
import { SharedModule } from '../../shared/shared.module';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@NgModule({
  declarations: [SettingsComponent, ConnectionsComponent, UsersComponent],
  imports: [
    CommonModule,
    SharedModule,
    SettingsRoutingModule,
    MatProgressSpinnerModule,

    MaterialModule,
  ],
})
export class SettingsModule {}
