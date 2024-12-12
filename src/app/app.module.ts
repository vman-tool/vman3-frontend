import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

// import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AuthInterceptor } from './core/interceptors/csrfinterceptor.service';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ConfigService } from './app.service';
import { lastValueFrom, Observable } from 'rxjs';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';
import { SharedConfirmationComponent } from './shared/dialogs/shared-confirmation/shared-confirmation.component';

// import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
// const config: SocketIoConfig = {
//   url: 'http://localhost:8080/vman/api/v1',
//   options: {},
// };

export function initializeApp(configService: ConfigService) {
  return async () => {
    return await configService.loadConfig();
  };
}

@NgModule({
  declarations: [AppComponent, SharedConfirmationComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    AppRoutingModule,
    // SocketIoModule.forRoot(config),
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    provideHttpClient(withInterceptorsFromDi()),
    provideCharts(withDefaultRegisterables()),
    provideAnimationsAsync(),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
