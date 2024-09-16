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
import { Icd10Component } from './containers/icd10/icd10.component';
import { Icd10CodesComponent } from './components/icd10-codes/icd10-codes.component';
import { Icd10CodesCategoriesComponent } from './components/icd10-codes-categories/icd10-codes-categories.component';

@NgModule({
  declarations: [
    SettingsComponent,
    DataSyncComponent,
    ConfigurationComponent,
    SettingsConfigsFormComponent,
    UsersComponent,
    ConnectionFormComponent,
    Icd10Component,
    Icd10CodesComponent,
    Icd10CodesCategoriesComponent,
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
