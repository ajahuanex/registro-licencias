import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    // Public route — no auth required (accessed via QR code scans)
    path: 'verificar/:id',
    loadComponent: () => import('./verificar-reporte/verificar-reporte.component').then(m => m.VerificarReporteComponent)
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
        path: 'mis-expedientes',
        loadComponent: () => import('./mis-expedientes/mis-expedientes').then(m => m.MisExpedientes)
      },
      {
        path: 'operadores',
        loadComponent: () => import('./operadores/lista/lista').then(m => m.Lista)
      },
      {
        path: 'reportes/diario',
        loadComponent: () => import('./reportes/diario/diario.component').then(m => m.DiarioComponent)
      },
      {
        path: 'entregas',
        loadComponent: () => import('./entregas/entregas.component').then(m => m.EntregasComponent)
      },
      // Configuraciones OTI (Module added dynamically)
      {
        path: 'configuraciones',
        loadComponent: () => import('./configuraciones/configuraciones.component').then(m => m.ConfiguracionesComponent)
      },
      // Auditoría (Module added dynamically)
      {
        path: 'auditoria',
        loadComponent: () => import('./auditoria/auditoria.component').then(m => m.AuditoriaComponent)
      },
      {
        path: 'historial-reportes',
        loadComponent: () => import('./historial-reportes/historial-reportes.component').then(m => m.HistorialReportesComponent)
      },
      {
        path: 'reporte-mensual',
        loadComponent: () => import('./reporte-mensual/reporte-mensual.component').then(m => m.ReporteMensualComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
