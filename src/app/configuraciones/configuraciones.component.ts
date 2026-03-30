import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PocketbaseService } from '../core/services/pocketbase.service';
import { ExpedienteService } from '../core/services/expediente.service';
import { ESTADOS_SISTEMA, PERFILES_SISTEMA } from '../core/constants/app.constants';

// ─── Sync Modal ───────────────────────────────────────────────────────────────
@Component({
  selector: 'app-admin-auth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule,
            MatFormFieldModule, MatInputModule, MatProgressBarModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Sincronización de Esquema PocketBase</h2>
    <mat-dialog-content>
      <p style="margin-bottom:16px;color:#555;">
        Ingresa las credenciales de Super Admin de PocketBase para verificar y reparar todas las colecciones del sistema.
      </p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Email Admin PocketBase</mat-label>
          <input matInput formControlName="email" type="email">
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Contraseña Admin</mat-label>
          <input matInput formControlName="password" type="password">
        </mat-form-field>
      </form>
      @if (logs().length > 0) {
        <div style="background:#1e1e1e;color:#00ff00;font-family:monospace;padding:12px;
                    border-radius:6px;font-size:11px;height:220px;overflow-y:auto;margin-top:8px;">
          @for (log of logs(); track $index) { <div>> {{ log }}</div> }
        </div>
      }
      @if (isRunning()) {
        <mat-progress-bar mode="indeterminate" style="margin-top:10px;"></mat-progress-bar>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="isRunning()">Cerrar</button>
      <button mat-flat-button color="warn" [disabled]="form.invalid || isRunning()" (click)="iniciarSync()">
        <mat-icon>sync</mat-icon> Sincronizar
      </button>
    </mat-dialog-actions>
  `
})
export class AdminAuthModal {
  private fb = inject(FormBuilder);
  private pbService = inject(PocketbaseService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  logs = signal<string[]>([]);
  isRunning = signal(false);

  private log(msg: string) { this.logs.update(l => [...l, msg]); }

  async iniciarSync() {
    if (this.form.invalid) return;
    this.isRunning.set(true);
    this.logs.set([]);
    const { email, password } = this.form.value;
    // Use pb.baseURL so the proxy path is included (works for phone + PC)
    const pbUrl = this.pbService.pb.baseURL;

    const doFetch = async (path: string, opts: any = {}) => {
      const { authToken, ...fetchOpts } = opts;
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      return fetch(pbUrl + path, { ...fetchOpts, headers: { ...headers, ...(fetchOpts.headers || {}) } });
    };

    try {
      // 1. Auth via _superusers (PocketBase v0.23+)
      this.log('🔐 Autenticando como Super Admin...');
      const authRes = await doFetch('/api/collections/_superusers/auth-with-password', {
        method: 'POST', body: JSON.stringify({ identity: email, password })
      });
      if (!authRes.ok) throw new Error('Credenciales inválidas — verifica email y contraseña del admin PocketBase.');
      const { token } = await authRes.json();
      this.log('✅ Autenticado correctamente.');

      const getCol = async (name: string) => {
        const r = await doFetch(`/api/collections/${name}`, { authToken: token });
        return r.ok ? r.json() : null;
      };
      const patchCol = async (name: string, body: any) => {
        const r = await doFetch(`/api/collections/${name}`, {
          method: 'PATCH', authToken: token, body: JSON.stringify(body)
        });
        if (!r.ok) { this.log(`  ⚠ PATCH /${name}: ${await r.text()}`); }
        return r.ok;
      };
      const createCol = async (body: any) => {
        const r = await doFetch(`/api/collections`, {
          method: 'POST', authToken: token, body: JSON.stringify(body)
        });
        if (!r.ok) { this.log(`  ❌ Error creando colección: ${await r.text()}`); }
        return r.ok;
      };

      // ── 2. expedientes ────────────────────────────────────────────────────
      this.log('');
      this.log('⏳ [1/4] Verificando "expedientes"...');
      const expCol = await getCol('expedientes');
      if (expCol) {
        // Estado select values
        const estadoField = expCol.fields?.find((f: any) => f.name === 'estado');
        if (estadoField) {
          const current: string[] = estadoField.values || estadoField.options?.values || [];
          const missing = ESTADOS_SISTEMA.filter(e => !current.includes(e));
          if (missing.length) {
            const merged = [...new Set([...current, ...ESTADOS_SISTEMA])];
            estadoField.values = merged;
            if (estadoField.options) estadoField.options.values = merged;
            const ok = await patchCol('expedientes', { fields: expCol.fields });
            this.log(ok ? `  ✅ Estados añadidos: ${missing.join(', ')}` : '  ❌ Error actualizando estados');
          } else {
            this.log('  ✅ "expedientes.estado" — completo.');
          }
        }
        // celular field
        const hasCelular = expCol.fields?.some((f: any) => f.name === 'celular');
        if (!hasCelular) {
          expCol.fields.push({ name: 'celular', type: 'text', required: false });
          const ok = await patchCol('expedientes', { fields: expCol.fields });
          this.log(ok ? '  ✅ Campo "celular" añadido.' : '  ❌ Error añadiendo celular');
        } else {
          this.log('  ✅ "expedientes.celular" — existe.');
        }

        // new verification checks
        const newChecks = ['reviso_sanciones'];
        let updatedExp = false;
        for (const check of newChecks) {
          if (!expCol.fields?.some((f: any) => f.name === check)) {
            expCol.fields.push({ name: check, type: 'bool', required: false });
            updatedExp = true;
          }
        }
        if (updatedExp) {
          const ok = await patchCol('expedientes', { fields: expCol.fields });
          this.log(ok ? '  ✅ Campos de verificación añadidos.' : '  ❌ Error añadiendo verificaciones');
        } else {
          this.log('  ✅ Campos de verificación — existen.');
        }
        } else {
          this.log('  ❌ Colección "expedientes" no encontrada. Creando...');
          const ok = await createCol({
            name: 'expedientes',
            type: 'base',
            system: false,
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '',
            fields: [
              { name: 'dni', type: 'text', required: true },
              { name: 'nombre', type: 'text', required: true },
              { name: 'apellido', type: 'text', required: true },
              { name: 'celular', type: 'text', required: false },
              { name: 'estado', type: 'select', required: true, options: { values: [
                'EN PROCESO','IMPRESO','VERIFICADO','ENTREGADO','OBSERVADO','RECHAZADO','ANULADO','ATENDIDO'
              ] } },
              { name: 'reviso_sanciones', type: 'bool', required: false }
            ]
          });
          this.log(ok ? '  ✅ Colección "expedientes" creada.' : '  ❌ Error creando "expedientes"');
        }

      // ── 3. operadores.perfil ──────────────────────────────────────────────
      this.log('⏳ [2/4] Verificando "operadores"...');
      const opCol = await getCol('operadores');
      if (opCol) {
        const perfilField = opCol.fields?.find((f: any) => f.name === 'perfil');
        if (perfilField) {
          const current: string[] = perfilField.values || perfilField.options?.values || [];
          const missing = PERFILES_SISTEMA.filter(p => !current.includes(p));
          if (missing.length) {
            const merged = [...new Set([...current, ...PERFILES_SISTEMA])];
            perfilField.values = merged;
            if (perfilField.options) perfilField.options.values = merged;
            const ok = await patchCol('operadores', { fields: opCol.fields });
            this.log(ok ? `  ✅ Perfiles añadidos: ${missing.join(', ')}` : '  ❌ Error actualizando perfiles');
          } else {
            this.log('  ✅ "operadores.perfil" — completo.');
          }
        }
        await patchCol('operadores', { listRule: "@request.auth.id != ''", viewRule: "@request.auth.id != ''" });
        this.log('  ✅ Reglas de acceso verificadas.');
        } else {
          this.log('  ❌ Colección "operadores" no encontrada. Creando...');
          const ok = await createCol({
            name: 'operadores',
            type: 'auth',
            system: false,
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '',
            fields: [
              { name: 'email', type: 'email', required: true, unique: true },
              { name: 'nombre', type: 'text', required: true },
              { name: 'apellido', type: 'text', required: true },
              { name: 'perfil', type: 'select', required: true, options: { values: [
                'REGISTRADOR','OPERADOR','IMPRESOR','SUPERVISOR','ENTREGADOR','ADMINISTRADOR','OTI'
              ] } }
            ]
          });
          this.log(ok ? '  ✅ Colección "operadores" creada.' : '  ❌ Error creando "operadores"');
        }

      // ── 4. historial_acciones ──────────────────────────────────────────
      this.log('⏳ [3/4] Verificando "historial_acciones"...');
      const histCol = await getCol('historial_acciones');
      if (histCol) {
        this.log('  ✅ "historial_acciones" — existe.');
      } else { 
        this.log('  ⏳ Creando "historial_acciones" desde cero...');
        const ok = await createCol({
          name: "historial_acciones",
          type: "base",
          system: false,
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: "@request.auth.id != ''",
          updateRule: "", deleteRule: "",
          fields: [
            { name: "expediente_id",    type: "text",     required: true  },
            { name: "expediente_dni",   type: "text",     required: false },
            { name: "operador_id",      type: "text",     required: true  },
            { name: "operador_nombre",  type: "text",     required: false },
            { name: "operador_perfil",  type: "text",     required: false },
            { name: "accion",           type: "text",     required: true  },
            { name: "estado_anterior",  type: "text",     required: false },
            { name: "estado_nuevo",     type: "text",     required: false },
            { name: "detalles",         type: "text",     required: false }
          ]
        });
        this.log(ok ? '  ✅ "historial_acciones" creada exitosamente.' : '  ❌ Fallo al crear historial_acciones.');
      }

      // ── 5. reportes_generados ─────────────────────────────────────────────
      this.log('⏳ [4/4] Verificando "reportes_generados"...');
      const repCol = await getCol('reportes_generados');
      if (repCol) {
        const hasSnapshot = repCol.fields?.some((f: any) => f.name === 'snapshot');
        if (!hasSnapshot) {
          repCol.fields.push({ name: 'snapshot', type: 'json', required: false });
          const ok = await patchCol('reportes_generados', { fields: repCol.fields });
          this.log(ok ? '  ✅ Campo "snapshot" añadido.' : '  ❌ Error añadiendo snapshot');
        } else {
          this.log('  ✅ "reportes_generados" — completo.');
        }
        await patchCol('reportes_generados', { viewRule: '' });
        this.log('  ✅ viewRule pública asegurada (verificación QR funciona sin login).');
      } else {
          this.log('  ❌ Colección "reportes_generados" no encontrada. Creando...');
          const ok = await createCol({
            name: 'reportes_generados',
            type: 'base',
            system: false,
            listRule: '',
            viewRule: '',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '',
            fields: [
              { name: 'nombre', type: 'text', required: true },
              { name: 'fecha', type: 'date', required: true },
              { name: 'snapshot', type: 'json', required: false }
            ]
          });
          this.log(ok ? '  ✅ Colección "reportes_generados" creada.' : '  ❌ Error creando "reportes_generados"');
        }

      this.log('');
      this.log('🎉 Sincronización completada. El sistema está listo.');

    } catch (err: any) {
      this.log('❌ Error: ' + (err.message || JSON.stringify(err)));
    } finally {
      this.isRunning.set(false);
    }
  }
}

// ─── Configuraciones Page ─────────────────────────────────────────────────────
@Component({
  selector: 'app-configuraciones',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
<div class="page-wrapper fade-in">
  <div class="header-actions">
    <div class="titles">
      <h1>Configuraciones Avanzadas — Nivel OTI</h1>
      <p>Gestión técnica de la base de datos y parámetros globales del sistema</p>
    </div>
  </div>

  <div class="settings-grid">

    <!-- Card 1: Sincronización -->
    <mat-card class="settings-card warning-card mat-elevation-z3">
      <mat-card-header>
        <mat-icon mat-card-avatar color="warn">build_circle</mat-icon>
        <mat-card-title>Sincronización de Esquema BD</mat-card-title>
        <mat-card-subtitle>Verifica y repara todas las colecciones PocketBase</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <p>Actualiza automáticamente:</p>
        <ul>
          <li><code>expedientes</code> — estado <strong>IMPRESO</strong> + campo <strong>celular</strong></li>
          <li><code>operadores.perfil</code> — añade <strong>IMPRESOR, REGISTRADOR…</strong></li>
          <li><code>historial_expedientes</code> — define todos los campos de auditoría</li>
          <li><code>reportes_generados</code> — campo <strong>snapshot</strong> + acceso público QR</li>
        </ul>
      </mat-card-content>
      <mat-card-actions align="end">
        <button mat-raised-button color="warn" (click)="openInitModal()">
          <mat-icon>sync</mat-icon> Sincronizar Esquema
        </button>
      </mat-card-actions>
    </mat-card>

    <!-- Card 2: Flujo de estados -->
    <mat-card class="settings-card mat-elevation-z3">
      <mat-card-header>
        <mat-icon mat-card-avatar color="primary">label</mat-icon>
        <mat-card-title>Estados del Flujo de Licencias</mat-card-title>
        <mat-card-subtitle>Ciclo de vida de un expediente</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="flow-list">
          <div class="flow-item"><span class="badge proc">EN PROCESO</span><span>Registrador / Operador ingresa el expediente</span></div>
          <div class="flow-item"><span class="badge impr">IMPRESO</span><span>El <strong>Impresor</strong> genera la licencia física</span></div>
          <div class="flow-item"><span class="badge aten">VERIFICADO</span><span>El <strong>Supervisor</strong> realiza el control de calidad</span></div>
          <div class="flow-item"><span class="badge entr">ENTREGADO</span><span>El <strong>Entregador</strong> confirma la entrega al usuario</span></div>
          <div class="flow-item"><span class="badge obs">OBSERVADO</span><span>Se requiere corrección o subsanación de datos</span></div>
          <div class="flow-item"><span class="badge rech">RECHAZADO</span><span>El trámite no procede (Incumplimiento)</span></div>
          <div class="flow-item"><span class="badge anul">ANULADO</span><span>Documento invalidado por Supervisor / OTI</span></div>
        </div>
      </mat-card-content>
    </mat-card>

    <!-- Card 3: Perfiles y accesos -->
    <mat-card class="settings-card mat-elevation-z3">
      <mat-card-header>
        <mat-icon mat-card-avatar color="accent">manage_accounts</mat-icon>
        <mat-card-title>Perfiles de Operadores</mat-card-title>
        <mat-card-subtitle>Accesos por rol en el sistema</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <table class="perfiles-table">
          <tr><th>Perfil</th><th>Estados disponibles</th></tr>
          <tr><td><code>REGISTRADOR / OPERADOR</code></td><td>EN PROCESO · OBSERVADO · RECHAZADO</td></tr>
          <tr><td><code>IMPRESOR</code></td><td>IMPRESO · OBSERVADO · EN PROCESO</td></tr>
          <tr><td><code>ENTREGADOR</code></td><td>ENTREGADO · OBSERVADO</td></tr>
          <tr><td><code>SUPERVISOR</code></td><td>VERIFICADO · OBSERVADO · RECHAZADO · ANULADO · EN PROCESO</td></tr>
          <tr><td><code>ADMINISTRADOR</code></td><td>Todos los estados (Gestión operativa)</td></tr>
          <tr><td><code>OTI</code></td><td>Todos los estados + Configuración del sistema</td></tr>
        </table>
      </mat-card-content>
      <mat-card-actions align="end">
        <button mat-stroked-button color="primary" routerLink="/auditoria">
          <mat-icon>launch</mat-icon> Abrir Visor de Auditoría
        </button>
      </mat-card-actions>
    </mat-card>

    <!-- Card 5: Cierre de Día (Automatismo 23:55) -->
    <mat-card class="settings-card mat-elevation-z3 primary-card">
      <mat-card-header>
        <mat-icon mat-card-avatar color="primary">access_time</mat-icon>
        <mat-card-title>Cierre Administrativo Diario</mat-card-title>
        <mat-card-subtitle>Migración masiva de ENTREGADO a ATENDIDO</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <p>Proceso automático configurado para las 23:55 de cada día (simulado mediante este botón para OTI).</p>
        <div style="background:#f1f5f9;padding:12px;border-radius:8px;font-size:0.85rem;margin-top:8px;">
           <mat-icon inline style="vertical-align:middle;font-size:16px;">info</mat-icon> 
           Al ejecutar, todos los expedientes en estado <strong>ENTREGADO</strong> pasarán a estado <strong>ATENDIDO</strong> y quedarán archivados.
        </div>
      </mat-card-content>
      <mat-card-actions align="end">
        <button mat-flat-button color="primary" (click)="ejecutarCierreMasivo()" [disabled]="processingCierre()">
          <mat-icon>{{ processingCierre() ? 'hourglass_empty' : 'send' }}</mat-icon>
          {{ processingCierre() ? 'Procesando...' : 'Ejecutar Cierre Masivo' }}
        </button>
      </mat-card-actions>
    </mat-card>

  </div>
</div>
  `,
  styles: [`
    .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem; padding: 1.5rem; }
    .settings-card { border-radius: 12px; }
    .warning-card { border-left: 4px solid #ef4444; }
    .flow-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    .flow-item { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: #555; }
    .badge { padding: 2px 10px; border-radius: 10px; font-size: 0.73rem; font-weight: 700; white-space: nowrap; }
    .badge.proc { background: #e0f2fe; color: #0284c7; }
    .badge.impr { background: #e0e7ff; color: #4338ca; }
    .badge.aten { background: #dcfce7; color: #15803d; }
    .badge.entr { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .badge.obs  { background: #ffedd5; color: #c2410c; }
    .badge.rech { background: #fee2e2; color: #b91c1c; }
    .badge.anul { background: #f1f5f9; color: #64748b; }
    .perfiles-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-top: 8px; }
    .perfiles-table th { text-align: left; padding: 6px 8px; background: #f8fafc; font-size: 0.72rem; text-transform: uppercase; color: #888; border-bottom: 2px solid #e2e8f0; }
    .perfiles-table td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; color: #444; }
    .perfiles-table code { background: #f0f4f8; padding: 1px 6px; border-radius: 4px; color: #0a3d62; font-size: 0.78rem; }
    .header-actions { padding: 1.5rem 1.5rem 0; }
    .titles h1 { margin: 0; font-size: 1.4rem; font-weight: 700; color: #0a3d62; }
    .titles p { margin: 4px 0 0; color: #888; font-size: 0.87rem; }
  `]
})
export class ConfiguracionesComponent {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private pbService = inject(PocketbaseService);
  private expedienteService = inject(ExpedienteService);

  processingCierre = signal(false);

  openInitModal() {
    this.dialog.open(AdminAuthModal, { width: '750px', maxWidth: '95vw', disableClose: true });
  }

  async ejecutarCierreMasivo() {
    if (!confirm('¿Está seguro de ejecutar el cierre administrativo? Todos los expedientes ENTREGADO pasarán a ATENDIDO.')) return;
    
    this.processingCierre.set(true);
    try {
      // Fetch all DELIVERED records
      const records = await this.pbService.pb.collection('expedientes').getFullList({
        filter: 'estado = "ENTREGADO"'
      });

      if (records.length === 0) {
        this.snackBar.open('No hay expedientes en estado ENTREGADO para cerrar.', 'Cerrar', { duration: 3000 });
        this.processingCierre.set(false);
        return;
      }

      this.snackBar.open(`Cerrando ${records.length} expedientes...`, 'Ok', { duration: 2000 });

      let count = 0;
      for (const r of records) {
        await this.expedienteService.updateExpediente(r.id, 
          { estado: 'ATENDIDO' }, 
          'CIERRE_AUTOMATICO_SISTEMA',
          '[CIERRE DIARIO AUTOMÁTICO 23:55]'
        );
        count++;
      }

      this.snackBar.open(`🎉 Cierre exitoso: ${count} expedientes pasaron a estado ATENDIDO.`, 'Cerrar', { 
        duration: 5000, 
        panelClass: ['success-snackbar'] 
      });
    } catch (e: any) {
      this.snackBar.open('Error en el cierre masivo: ' + e.message, 'Cerrar', { duration: 4000 });
    } finally {
      this.processingCierre.set(false);
    }
  }
}
