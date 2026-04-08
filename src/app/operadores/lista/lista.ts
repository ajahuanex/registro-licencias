import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { OperadorService } from '../../core/services/operador.service';
import { AuthService } from '../../core/services/auth.service';
import { RecordModel } from 'pocketbase';
import { ModalOperador } from '../modal-operador/modal-operador';
import { ConfirmImpersonationDialog } from '../confirm-impersonation-dialog';

import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Inject } from '@angular/core';
import { PocketbaseService } from '../../core/services/pocketbase.service';

@Component({
  selector: 'app-historial-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTableModule],
  template: `
    <h2 mat-dialog-title>Historial de Accesos (IP y Equipo)</h2>
    <mat-dialog-content>
      @if (loading()) {
        <p style="padding: 1rem 0;">Cargando registros...</p>
      } @else if (historial().length === 0) {
        <p style="padding: 1rem 0;">No hay accesos registrados de este operador.</p>
      } @else {
        <table class="full-width-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px; border-bottom: 1px solid #e2e8f0;">Fecha y Hora</th>
              <th style="text-align:left; padding:8px; border-bottom: 1px solid #e2e8f0;">IP Pública</th>
              <th style="text-align:left; padding:8px; border-bottom: 1px solid #e2e8f0;">Navegador/Equipo</th>
            </tr>
          </thead>
          <tbody>
            @for (log of historial(); track log.id) {
              <tr>
                <td style="padding:8px; border-bottom: 1px solid #f1f5f9;">{{ log.created | date:'short' }}</td>
                <td style="padding:8px; border-bottom: 1px solid #f1f5f9;"><strong>{{ log.ip_publica || 'Desconocida' }}</strong></td>
                <td style="padding:8px; border-bottom: 1px solid #f1f5f9; font-size: 0.85em; color: #64748b; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" [title]="log.user_agent">
                  {{ log.user_agent || 'N/A' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `
})
export class HistorialOperadorDialog implements OnInit {
  private pbService = inject(PocketbaseService);
  private snackBar = inject(MatSnackBar);
  historial = signal<any[]>([]);
  loading = signal<boolean>(true);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { operadorId: string, nombre: string }) {}

  async ngOnInit() {
    try {
      const records = await this.pbService.pb.collection('historial_acciones').getList(1, 20, {
        filter: `operador_id = '${this.data.operadorId}' && accion = 'LOGIN'`,
        sort: '-created'
      });
      this.historial.set(records.items);
    } catch (e: any) {
      console.warn("No se pudo cargar historial (puede que la tabla aún no exista):", e.message);
      this.snackBar.open("No se pudieron cargar registros o la característica es muy nueva.", "Cerrar", { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }
}

@Component({
  selector: 'app-lista',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './lista.html',
  styleUrl: './lista.scss'
})
export class Lista implements OnInit {
  private operadorService = inject(OperadorService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private titleService = inject(Title);

  operadores = signal<RecordModel[]>([]);
  searchTerm = signal<string>('');
  filteredOperadores = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const currentUser = this.authService.currentUser();
    const isOnlyAdmin = currentUser?.['perfil'] === 'ADMINISTRADOR';

    let list = this.operadores();
    
    // Hide OTI profile from Administrators
    if (isOnlyAdmin) {
      list = list.filter(op => op['perfil'] !== 'OTI');
    }

    if (!term) return list;
    return list.filter(op => 
       (op['nombre']?.toLowerCase() || '').includes(term) || 
       (op['dni'] || '').includes(term) || 
       (op['email']?.toLowerCase() || '').includes(term) ||
       (op['perfil']?.toLowerCase() || '').includes(term)
    );
  });
  
  isLoading = signal<boolean>(true);

  isOti = computed(() => {
    const user = this.authService.currentUser();
    const p = user?.['perfil'];
    return p === 'OTI' || p === 'ADMINISTRADOR';
  });

  displayedColumns = computed(() => {
    if (this.isOti()) {
      return ['dni', 'nombre', 'perfil', 'sede', 'email', 'conexion', 'acciones'];
    }
    return ['dni', 'nombre', 'perfil', 'sede', 'email', 'acciones'];
  });



  isCurrentUser(id: string) {
    return this.authService.currentUser()?.id === id;
  }

  actAs(operador: RecordModel) {
    console.log(`[LISTA] actAs invocado para: ${operador['nombre']} (ID: ${operador.id})`);
    
    const dialogRef = this.dialog.open(ConfirmImpersonationDialog, {
      width: '400px',
      data: { nombre: operador['nombre'] || operador['username'] }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log(`[LISTA] Dialog result: ${result}`);
      if (result) {
        this.authService.impersonate(operador);
      }
    });
  }

  async ngOnInit() {
    this.titleService.setTitle('Gestión de Operadores | DRTC Puno');
    await this.loadData();
  }

  async loadData(forceRefresh = false) {
    this.isLoading.set(true);

    // Si el usuario presionó específicamente el icono "Actualizar", forzamos
    // una revalidación severa de la sesión para purgar cachés fantasmas o tokens muertos.
    if (forceRefresh) {
      try {
        await (this.authService as any).pbService.pb.collection('operadores').authRefresh();
        this.snackBar.open('Caché sincronizado con la nube', 'Cerrar', { duration: 2000 });
      } catch (e) {
        console.warn('El token almacenado estaba corrupto o el usuario no existe. Cerrando sesión...');
        this.authService.logout();
        return;
      }
    }

    try {
      const data = await this.operadorService.getOperadores();
      console.log(`[DEBUG LISTA] getOperadores devolvió ${data.length} elementos:`, data);
      
      // AUTO-HEALING INTELIGENTE:
      // Si la lista de operadores viene vacía (lo cual es imposible en la práctica ya que el 
      // propio administrador validado debería estar listado) y no fue un refresh explícito,
      // la aplicación deduce que hay una anomalía y verifica silenciosamente la sesión real.
      if (data.length === 0 && !forceRefresh && this.isOti()) {
         console.warn("[DEBUG LISTA] Anomalía: 0 operadores retornados. Iniciando auto-diagnóstico silencioso de la sesión...");
         try {
           await (this.authService as any).pbService.pb.collection('operadores').authRefresh();
           // Si authRefresh funciona, el token es válido y la DB realmente está vacía (raro pero posible).
           // Procedemos repitiendo el GET con el token fresco.
           const refreshedData = await this.operadorService.getOperadores();
           this.operadores.set(refreshedData);
           return; // Salimos temprano
         } catch (e) {
           console.error('[AUTH] Diagnóstico falló: El usuario en caché ya no existe en el backend. Auto-reparando sesión.');
           this.authService.logout();
           return;
         }
      }

      this.operadores.set(data);
    } catch (e: any) {
      console.error(e);
      this.snackBar.open('Error al cargar operadores: ' + e.message, 'Cerrar', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  openModal(operador?: RecordModel) {
    // Prevent editing of blocked operators directly unless unblocked first
    if (operador && operador['perfil']?.startsWith('[BLOQUEADO]')) {
       this.snackBar.open('Desbloquee al operador primero para editar sus detalles.', 'Cerrar', { duration: 4000 });
       return;
    }

    const dialogRef = this.dialog.open(ModalOperador, {
      width: '500px',
      data: operador ? { ...operador } : null,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loadData(); // Reload list if changes were saved
      }
    });
  }

  // OTI Security Mechanisms
  openHistory(operador: RecordModel) {
     this.dialog.open(HistorialOperadorDialog, {
       width: '650px',
       maxWidth: '95vw',
       data: { operadorId: operador.id, nombre: operador['nombre'] }
     });
  }

  async toggleBlock(operador: RecordModel) {
     this.isLoading.set(true);
     try {
        let currentPerfil = operador['perfil'] || '';
        if (currentPerfil.startsWith('[BLOQUEADO]')) {
           currentPerfil = currentPerfil.replace('[BLOQUEADO] ', '').trim();
           if (currentPerfil === '') currentPerfil = 'REGISTRADOR'; // fallback general
        } else {
           currentPerfil = '[BLOQUEADO] ' + currentPerfil;
        }

        await this.operadorService.updateOperador(operador.id, { perfil: currentPerfil });
        this.snackBar.open(currentPerfil.includes('BLOQUEADO') ? 'Operador bloqueado (No podrá acceder)' : 'Operador desbloqueado', 'Cerrar', { duration: 3000 });
        await this.loadData();
     } catch (e: any) {
        this.snackBar.open('Error al modificar estado: ' + e.message, 'Err', { duration: 3000 });
     } finally {
        this.isLoading.set(false);
     }
  }

  async deleteOperador(id: string) {
    if (confirm('¿Está seguro de que desea eliminar este operador? Esta acción no se puede deshacer.')) {
      this.isLoading.set(true);
      try {
        await this.operadorService.deleteOperador(id);
        this.snackBar.open('Operador eliminado exitosamente.', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
        await this.loadData();
      } catch (e: any) {
        this.snackBar.open('Error al eliminar: ' + e.message, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
        this.isLoading.set(false);
      }
    }
  }
}
