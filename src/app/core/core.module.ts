import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreComponent } from './core.component';
import { CoreRoutingModule } from './core-routing.module';
import { SharedModule } from '../shared/shared.module';
import { BodyComponent } from './containers/body/body.component';
import { HeaderComponent } from './containers/header/header.component';
import { FooterComponent } from './containers/footer/footer.component';
import { MaterialModule } from '../material/material.module';
import { LoginComponent } from './components/login/login.component';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AccountSettingsComponent } from './dialogs/account-settings/account-settings.component';
import { SessionWarningModalComponent } from './dialogs/session-warning-modal/session-warning-modal.component';

@NgModule({
  declarations: [
    CoreComponent,
    HeaderComponent,
    BodyComponent,
    FooterComponent,
    LoginComponent,
    SidebarComponent,
    AccountSettingsComponent,
    SessionWarningModalComponent
  ],
  imports: [
    CommonModule,
    CoreRoutingModule,
    MaterialModule,
    FormsModule,
    SharedModule,
  ],
  exports: [CoreComponent],
})
export class CoreModule {}
