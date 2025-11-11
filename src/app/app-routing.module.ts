import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { CcvaPublicComponent } from './modules/ccva-public/ccva-public.component';
// import { authGuard } from './core/guards/auth.guard';
// import { NotFoundComponent } from './core/components/not-found/not-found.component';

const routes: Routes = [
  {
    path: '',
    component: AppComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./core/core.module').then((m) => m.CoreModule),
      },

    ],
  },
  {
    path: 'ccva-public',
    component:  CcvaPublicComponent,
    // children: [
    //   {
    //     path: '',
    //     loadChildren: () =>
    //       import('./core/core.module').then((m) => m.CoreModule),
    //   },

    // ],
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
