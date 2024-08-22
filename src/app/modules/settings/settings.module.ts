import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigurationComponent } from './components/configuration/configuration.component';
import { UsersComponent } from './components/users/users.component';
import { MaterialModule } from '../../material/material.module';
import { SharedModule } from '../../shared/shared.module';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DataSyncComponent } from './components/data-sync/data-sync.component';
import { SettingsConfigsFormComponent } from './dialogs/settings-configs-form/settings-configs-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConnectionFormComponent } from './dialogs/connection-form/connection-form.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';

@NgModule({
  declarations: [
    SettingsComponent,
    DataSyncComponent,
    ConfigurationComponent,
    SettingsConfigsFormComponent,
    UsersComponent,
    ConnectionFormComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    SettingsRoutingModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    SearchableSelectComponent,
  ],
})
export class SettingsModule {}
