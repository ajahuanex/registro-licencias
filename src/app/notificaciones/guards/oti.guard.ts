import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PocketbaseService } from '../../core/services/pocketbase.service';

/**
 * Guard OTI – Solo usuarios con role == 'OTI' en PocketBase
 * pueden activar las rutas del módulo de notificaciones.
 *
 * Uso en routes:
 *   { path: 'notificaciones-oti', canActivate: [otiGuard], component: OtiNotificationComponent }
 */
export const otiGuard: CanActivateFn = () => {
  const pbService = inject(PocketbaseService);
  const router    = inject(Router);

  const model = pbService.pb.authStore.model;
  const isAuthenticated = pbService.pb.authStore.isValid;
  const isOTI = model?.['perfil'] === 'OTI' || model?.['perfil'] === 'ADMINISTRADOR';

  if (isAuthenticated && isOTI) {
    return true;
  }

  // Redirige al dashboard con un query param de error
  router.navigate(['/'], { queryParams: { error: 'acceso-denegado' } });
  return false;
};
