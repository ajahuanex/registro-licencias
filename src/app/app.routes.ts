import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'expedientes/registro',
        loadComponent: () => import('./expedientes/registro/registro.component').then(m => m.RegistroComponent)
      },
      {
        path: 'reportes/diario',
        loadComponent: () => import('./reportes/diario/diario.component').then(m => m.DiarioComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
