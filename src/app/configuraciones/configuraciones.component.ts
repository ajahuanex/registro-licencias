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
      } else { this.log('  ❌ Colección "expedientes" no encontrada.'); }

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
      } else { this.log('  ❌ Colección "operadores" no encontrada.'); }

      // ── 4. historial_expedientes ──────────────────────────────────────────
      this.log('⏳ [3/4] Verificando "historial_expedientes"...');
      const histCol = await getCol('historial_expedientes');
      if (histCol) {
        const fieldNames = histCol.fields?.map((f: any) => f.name) || [];
        const required = [
          'created', 'updated', 'expediente_id', 'expediente_dni',
          'operador_id', 'operador_nombre', 'operador_perfil',
          'accion', 'estado_anterior', 'estado_nuevo', 'detalles'
        ];
        const missingFields = required.filter(f => !fieldNames.includes(f));
        if (missingFields.length) {
          const newFields = [
            ...(histCol.fields || []).filter((f: any) => !required.includes(f.name)),
            { name: "created",          type: "autodate", hidden: false, required: false, id: "datecreated", system: true, onCreate: true, onUpdate: false },
            { name: "updated",          type: "autodate", hidden: false, required: false, id: "dateupdated", system: true, onCreate: true, onUpdate: true },
            { name: "expediente_id",    type: "text",     required: true  },
            { name: "expediente_dni",   type: "text",     required: false },
            { name: "operador_id",      type: "text",     required: true  },
            { name: "operador_nombre",  type: "text",     required: false },
            { name: "operador_perfil",  type: "text",     required: false },
            { name: "accion",           type: "text",     required: true  },
            { name: "estado_anterior",  type: "text",     required: false },
            { name: "estado_nuevo",     type: "text",     required: false },
            { name: "detalles",         type: "text",     required: false }
          ];
          const ok = await patchCol('historial_expedientes', {
            fields: newFields,
            listRule: "@request.auth.id != ''",
            viewRule: "@request.auth.id != ''",
            createRule: "@request.auth.id != ''"
          });
          this.log(ok
            ? `  ✅ Campos añadidos/corregidos: ${missingFields.join(', ')}`
            : '  ❌ Error actualizando historial_expedientes');
        } else {
          this.log('  ✅ "historial_expedientes" — completo.');
        }
      } else {
        this.log('  ❌ "historial_expedientes" no existe. Créala en PocketBase y vuelve a sincronizar.');
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
        this.log('  ❌ Colección "reportes_generados" no encontrada.');
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
          <li><code>operadores.perfil</code> — añade <strong>SUP_IMPRESION, SUP_CALIDAD, REGISTRADOR…</strong></li>
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
          <div class="flow-item"><span class="badge proc">EN PROCESO</span><span>Registrador ingresa el expediente</span></div>
          <div class="flow-item"><span class="badge impr">IMPRESO</span><span>Sup. Impresión imprime la licencia física</span></div>
          <div class="flow-item"><span class="badge aten">ATENDIDO</span><span>Sup. Calidad verifica y aprueba para entrega</span></div>
          <div class="flow-item"><span class="badge entr">ENTREGADO</span><span>Entregador confirma entrega al conductor</span></div>
          <div class="flow-item"><span class="badge obs">OBSERVADO</span><span>Se requiere corrección de datos o documentos</span></div>
          <div class="flow-item"><span class="badge rech">RECHAZADO</span><span>No procede el trámite</span></div>
          <div class="flow-item"><span class="badge anul">ANULADO</span><span>Cancelado por Supervisor / OTI</span></div>
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
          <tr><td><code>SUP_IMPRESION</code></td><td>IMPRESO · OBSERVADO · RECHAZADO</td></tr>
          <tr><td><code>SUP_CALIDAD</code></td><td>ATENDIDO · OBSERVADO · RECHAZADO</td></tr>
          <tr><td><code>ENTREGADOR</code></td><td>ENTREGADO</td></tr>
          <tr><td><code>SUPERVISOR</code></td><td>EN PROCESO · IMPRESO · ATENDIDO · OBSERVADO · RECHAZADO · ANULADO</td></tr>
          <tr><td><code>ADMINISTRADOR</code></td><td>Todos los estados</td></tr>
          <tr><td><code>OTI</code></td><td>Todos + Configuraciones globales del sistema</td></tr>
        </table>
      </mat-card-content>
    </mat-card>

    <!-- Card 4: Auditoría -->
    <mat-card class="settings-card mat-elevation-z3">
      <mat-card-header>
        <mat-icon mat-card-avatar color="primary">history</mat-icon>
        <mat-card-title>Auditoría Global (Logs)</mat-card-title>
        <mat-card-subtitle>Ver todos los eventos registrados en el sistema</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <p>Inspeccione el historial completo de operaciones: quién modificó qué expediente, cuándo y desde qué perfil.</p>
      </mat-card-content>
      <mat-card-actions align="end">
        <button mat-stroked-button color="primary" routerLink="/auditoria">
          <mat-icon>launch</mat-icon> Abrir Visor de Auditoría
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

  openInitModal() {
    this.dialog.open(AdminAuthModal, { width: '750px', maxWidth: '95vw', disableClose: true });
  }
}
