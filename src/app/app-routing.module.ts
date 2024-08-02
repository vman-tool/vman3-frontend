import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
// import { authGuard } from './core/guards/auth.guard';
// import { NotFoundComponent } from './core/components/not-found/not-found.component';

const routes: Routes = [
  {
    path: '',
    component: AppComponent,
    children: [
      {
        // Core module
        path: '',
        loadChildren: () =>
          import('./core/core.module').then(
            (importation) => importation.CoreModule
          ),
      },

      //   {
      //   path: '**',
      //     component: NotFoundComponent,
      //   },
    ],
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      preloadingStrategy: PreloadAllModules,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
