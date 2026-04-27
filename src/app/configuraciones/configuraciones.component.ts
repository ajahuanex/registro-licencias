import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import PocketBase from 'pocketbase';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
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
import { SeedDataService } from '../core/services/seed-data.service';
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
      @if (backupReady()) {
        <div style="margin-top:16px; padding:16px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; text-align:center;">
          <p style="margin:0 0 12px; font-weight:600; color:#0369a1;">✅ ¡Respaldo solicitado con éxito!</p>
          <p style="font-size:0.82rem; color:#666; margin-bottom:12px;">
            Por seguridad y rendimiento, descarga el archivo directamente desde la interfaz oficial de PocketBase.
          </p>
          <button mat-stroked-button color="primary" (click)="abrirPanelAdmin()">
            <mat-icon>launch</mat-icon> IR AL PANEL ADMINISTRATIVO (PUERTO 8095)
          </button>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="isRunning()">Cerrar</button>
      <button mat-flat-button color="accent" [disabled]="form.invalid || isRunning()" (click)="generarBackup()">
        <mat-icon>backup</mat-icon> Respaldar BD
      </button>
      <button mat-flat-button color="warn" [disabled]="form.invalid || isRunning()" (click)="iniciarSync()" style="margin-left:8px;">
        <mat-icon>sync</mat-icon> Sincronizar
      </button>
      <button mat-flat-button color="primary" [disabled]="isRunning()" (click)="resetAll()" style="margin-left:8px;">
        <mat-icon>restart_alt</mat-icon> Resetear Base de Datos
      </button>

      <div style="margin-top: 16px; border-top: 1px dashed #ccc; padding-top: 16px; display: flex; justify-content: space-between; gap: 8px;">
        <button mat-stroked-button color="accent" [disabled]="form.invalid || isRunning()" (click)="limpiarDatosEjemplo()" style="flex: 1;">
          <mat-icon>delete_sweep</mat-icon> Quitar Datos Ejemplo
        </button>
        <button mat-raised-button color="accent" [disabled]="form.invalid || isRunning()" (click)="generarDatosEjemplo()" style="flex: 1;">
          <mat-icon>auto_awesome</mat-icon> Generar Datos Ejemplo
        </button>
      </div>
    </mat-dialog-actions>
  `
})
export class AdminAuthModal {
  private fb = inject(FormBuilder);
  private pbService = inject(PocketbaseService);
  private seedService = inject(SeedDataService);
  private snackBar = inject(MatSnackBar);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  isRunning = signal(false);
  backupReady = signal(false);
  logs = signal<string[]>([]);

  private log(msg: string) { this.logs.update(l => [...l, msg]); }

  async iniciarSync() {
    if (this.form.invalid) return;
    this.isRunning.set(true);
    this.logs.set([]);

    try {
      const { email, password } = this.form.value;
      const pbUrl = this.pbService.pb.baseURL;
      const doFetch = async (path: string, opts: any = {}) => {
        const { authToken, ...fetchOpts } = opts;
        const headers: any = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        return fetch(pbUrl + path, { ...fetchOpts, headers: { ...headers, ...(fetchOpts.headers || {}) } });
      };

      this.log('🔐 Autenticando como Super Admin...');
      const authRes = await doFetch('/api/collections/_superusers/auth-with-password', {
        method: 'POST',
        body: JSON.stringify({ identity: email, password })
      });
      if (!authRes.ok) throw new Error('Credenciales inválidas — verifica email y contraseña.');
      const { token } = await authRes.json();
      this.log('✅ Autenticado correctamente.');

      const getCol = async (name: string) => {
        const r = await doFetch(`/api/collections?filter=name='${name}'`, { authToken: token });
        if (r.ok) {
          const data = await r.json();
          return data.items && data.items.length > 0 ? data.items[0] : null;
        }
        return null;
      };

      const patchCol = async (idOrName: string, body: any) => {
        const r = await doFetch(`/api/collections/${idOrName}`, {
          method: 'PATCH', authToken: token, body: JSON.stringify(body)
        });
        if (!r.ok) { this.log(`  ⚠ Error PATCH ${idOrName}: ${await r.text()}`); }
        return r.ok;
      };

      const createCol = async (body: any) => {
        const r = await doFetch(`/api/collections`, {
          method: 'POST', authToken: token, body: JSON.stringify(body)
        });
        if (!r.ok) { this.log(`  ⚠ POST /collections: ${await r.text()}`); }
        return r.ok;
      };

      const expCol = await getCol('expedientes');
      const opColActual = await getCol('operadores');
      const expId = expCol?.id || 'expedientes';
      const opId = opColActual?.id || 'operadores';

      // ── 1. expedientes ──────────────────────────────────────────────────
      try {
        this.log('');
        this.log('⏳ [1/7] Verificando "expedientes"...');
        if (expCol) {
          let fields = [...expCol.fields];
          let needsUpdate = false;
          const opField = fields.find((f: any) => f.name === 'operador');
          if (opField && opField.type !== 'relation') {
            opField.name = 'operador_legacy';
            fields.push({
              name: 'operador', type: 'relation', required: true,
              options: { collectionId: opId, maxSelect: 1, minSelect: 0, cascadeDelete: false }
            });
            needsUpdate = true;
          }
          const stField = fields.find((f: any) => f.name === 'estado');
          if (stField && stField.type === 'select') {
            const current = stField.values || stField.options?.values || [];
            const missing = ESTADOS_SISTEMA.filter(e => !current.includes(e));
            if (missing.length) {
              const merged = [...new Set([...current, ...ESTADOS_SISTEMA])];
              if (stField.options) stField.options.values = merged; else stField.values = merged;
              needsUpdate = true;
            }
          }

          // tramite: ensure required options
          const trField = fields.find((f: any) => f.name === 'tramite');
          if (trField && trField.type === 'select') {
            const req = ['OBTENCIÓN', 'REVALIDACIÓN', 'DUPLICADO', 'RECATEGORIZACIÓN'];
            const current = trField.values || trField.options?.values || [];
            if (req.some(r => !current.includes(r))) {
              const merged = [...new Set([...current, ...req])];
              if (trField.options) trField.options.values = merged; else trField.values = merged;
              needsUpdate = true;
            }
          }

          // categoria: ensure required options
          const catField = fields.find((f: any) => f.name === 'categoria');
          if (catField && catField.type === 'select') {
            const req = ['A-I', 'A-IIa', 'A-IIb', 'A-IIIa', 'A-IIIb', 'A-IIIc', 'B-I', 'B-IIa', 'B-IIb', 'B-IIc'];
            const current = catField.values || catField.options?.values || [];
            if (req.some(r => !current.includes(r))) {
              const merged = [...new Set([...current, ...req])];
              if (catField.options) catField.options.values = merged; else catField.values = merged;
              needsUpdate = true;
            }
          }

          // lugar_entrega: ensure PUNO/JULIACA
          const lgField = fields.find((f: any) => f.name === 'lugar_entrega');
          if (lgField && lgField.type === 'select') {
            const current = lgField.values || lgField.options?.values || [];
            if (!current.includes('PUNO') || !current.includes('JULIACA')) {
              const merged = [...new Set([...current, 'PUNO', 'JULIACA'])];
              if (lgField.options) lgField.options.values = merged; else lgField.values = merged;
              needsUpdate = true;
            }
          }

          if (!fields.find((f: any) => f.name === 'fecha_entrega')) {
            fields.push({ name: 'fecha_entrega', type: 'date', required: false });
            needsUpdate = true;
          }
          if (!fields.find((f: any) => f.name === 'es_ejemplo')) {
            fields.push({ name: 'es_ejemplo', type: 'bool', required: false });
            needsUpdate = true;
          }
          if (needsUpdate) await patchCol(expId, { fields });

          await patchCol(expId, {
            listRule: '@request.auth.id != "" || (dni_solicitante != "")',
            viewRule: ""
          });
          this.log('  ✅ "expedientes" verificado.');
        } else {
          await createCol({
            name: 'expedientes', type: 'base',
            listRule: '@request.auth.id != "" || (dni_solicitante != "")', viewRule: "",
            fields: [
              { name: 'operador', type: 'relation', required: true, options: { collectionId: opId, maxSelect: 1 } },
              { name: 'dni_solicitante', type: 'text', required: true },
              { name: 'apellidos_nombres', type: 'text', required: true },
              { name: 'tramite', type: 'select', required: true, values: ['OBTENCIÓN', 'REVALIDACIÓN', 'DUPLICADO', 'RECATEGORIZACIÓN'] },
              { name: 'estado', type: 'select', required: true, values: ESTADOS_SISTEMA },
              { name: 'categoria', type: 'select', required: true, values: ['A-I', 'A-IIa', 'A-IIb', 'A-IIIa', 'A-IIIb', 'A-IIIc', 'B-I', 'B-IIa', 'B-IIb', 'B-IIc'] },
              { name: 'lugar_entrega', type: 'select', required: true, values: ['PUNO', 'JULIACA'] },
              { name: 'fecha_registro', type: 'date', required: true },
              { name: 'fecha_entrega', type: 'date', required: false },
              { name: 'es_ejemplo', type: 'bool', required: false }
            ]
          });
          this.log('  ✅ "expedientes" creado.');
        }
      } catch (e: any) { this.log(`  ❌ Error expedientes: ${e.message}`); }

      // ── 2. operadores ──────────────────────────────────────────────────
      try {
        this.log('');
        this.log('⏳ [2/7] Verificando "operadores"...');
        if (opColActual) {
          let fields = [...opColActual.fields];
          let needsUpdate = false;

          // sede: handle text vs select
          const sdField = fields.find((f: any) => f.name === 'sede');
          if (!sdField) {
            fields.push({ name: 'sede', type: 'text', required: false });
            needsUpdate = true;
          } else if (sdField.type === 'select') {
            const current = sdField.values || sdField.options?.values || [];
            if (!current.includes('PUNO') || !current.includes('JULIACA')) {
              const merged = [...new Set([...current, 'PUNO', 'JULIACA'])];
              if (sdField.options) sdField.options.values = merged; else sdField.values = merged;
              needsUpdate = true;
            }
          }

          // perfil: ensure PERFILES_SISTEMA are present
          const pfField = fields.find((f: any) => f.name === 'perfil');
          if (pfField && pfField.type === 'select') {
            const current = pfField.values || pfField.options?.values || [];
            const missing = PERFILES_SISTEMA.filter(p => !current.includes(p));
            if (missing.length) {
              const merged = [...new Set([...current, ...PERFILES_SISTEMA])];
              if (pfField.options) pfField.options.values = merged; else pfField.values = merged;
              needsUpdate = true;
            }
          }

          if (!fields.find((f: any) => f.name === 'dni')) {
            fields.push({ name: 'dni', type: 'text', required: true });
            needsUpdate = true;
          }
          if (!fields.find((f: any) => f.name === 'es_ejemplo')) {
            fields.push({ name: 'es_ejemplo', type: 'bool', required: false });
            needsUpdate = true;
          }
          if (needsUpdate) await patchCol(opId, { fields });

          await patchCol(opId, {
            listRule: "@request.auth.id != ''", viewRule: "@request.auth.id != ''",
            manageRule: "@request.auth.id != ''",
            passwordAuth: { identityFields: ['email', 'dni'], enabled: true }
          });
          this.log('  ✅ "operadores" verificado.');
        }
      } catch (e: any) { this.log(`  ❌ Error operadores: ${e.message}`); }

      // ── 3. sedes ─────────────────────────────────────────────────────
      try {
        this.log('');
        this.log('⏳ [3/7] Verificando "sedes"...');
        const sedesCol = await getCol('sedes');
        if (sedesCol) {
          this.log('  ✅ "sedes" verificado.');
        } else {
          await createCol({
            name: 'sedes', type: 'base',
            listRule: '', viewRule: '',
            createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""',
            fields: [
              { name: 'nombre', type: 'text', required: true },
              { name: 'es_centro_entrega', type: 'bool', required: false },
              { name: 'es_ejemplo', type: 'bool', required: false }
            ]
          });
          await this.pbService.pb.collection('sedes').create({ nombre: 'PUNO', es_centro_entrega: true });
          await this.pbService.pb.collection('sedes').create({ nombre: 'JULIACA', es_centro_entrega: true });
          this.log('  ✅ "sedes" creadas.');
        }
      } catch (e: any) { this.log(`  ❌ Error sedes: ${e.message}`); }

      // ── 4. historial_acciones ──────────────────────────────────────────
      try {
        this.log('');
        this.log('⏳ [4/7] Verificando "historial_acciones"...');
        const histCol = await getCol('historial_acciones');
        if (histCol) {
          let fields = [...histCol.fields];
          let needsUpdate = false;
          
          const requiredFields = [
            { name: 'expediente_dni', type: 'text' },
            { name: 'operador_nombre', type: 'text' },
            { name: 'operador_perfil', type: 'text' },
            { name: 'ip_publica', type: 'text' },
            { name: 'user_agent', type: 'text' },
            { name: 'fecha', type: 'date' },
            { name: 'es_ejemplo', type: 'bool' }
          ];

          for (const rf of requiredFields) {
            const existing = fields.find((f: any) => f.name === rf.name);
            if (!existing) {
              this.log(`    ➕ Añadiendo campo "${rf.name}" (${rf.type})...`);
              fields.push({ name: rf.name, type: rf.type, required: false });
              needsUpdate = true;
            } else {
              this.log(`    ✔️ Campo "${rf.name}" detectado (${existing.type}).`);
            }
          }

          if (needsUpdate) {
            this.log('  ⚠️ Aplicando cambios al esquema de historial...');
            await patchCol(histCol.id, { fields });
          }
          
          this.log('  🔓 Liberando permisos públicos para "historial_acciones"...');
          await patchCol(histCol.id, { listRule: "", viewRule: "" });
          this.log('  ✅ "historial_acciones" verificado.');
        } else {
          await createCol({
            name: 'historial_acciones', type: 'base',
            listRule: "", viewRule: "",
            createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""',
            fields: [
              { name: 'expediente_id', type: 'text', required: false },
              { name: 'expediente_dni', type: 'text', required: false },
              { name: 'operador_id', type: 'text', required: true },
              { name: 'operador_nombre', type: 'text', required: false },
              { name: 'operador_perfil', type: 'text', required: false },
              { name: 'accion', type: 'text', required: true },
              { name: 'detalles', type: 'text', required: false },
              { name: 'ip_publica', type: 'text', required: false },
              { name: 'user_agent', type: 'text', required: false },
              { name: 'fecha', type: 'date', required: false },
              { name: 'es_ejemplo', type: 'bool', required: false }
            ]
          });
          this.log('  ✅ "historial_acciones" creado.');
        }
      } catch (e: any) { this.log(`  ❌ Error historial: ${e.message}`); }

      // ── 5. reportes_generados y historial_expedientes ───────────────────
      try {
        this.log('');
        this.log('⏳ [5/7] Verificando colecciones de reportes...');
        const hExp = await getCol('historial_expedientes');
        if (hExp) {
          // Asegurar permisos públicos en historial_expedientes para el rastreador
          await patchCol(hExp.id, { listRule: "", viewRule: "" });
        } else {
          await createCol({ name: 'historial_expedientes', type: 'base', listRule: "", viewRule: "", fields: [{ name: 'expediente_id', type: 'text' }] });
        }
        
        const repCol = await getCol('reportes_generados');
        if (repCol) {
          let fields = [...repCol.fields];
          let needsUpdate = false;
          if (!fields.find((f: any) => f.name === 'archivo')) {
            fields.push({ name: 'archivo', type: 'file', options: { maxSelect: 1 } });
            needsUpdate = true;
          }
          if (needsUpdate) await patchCol(repCol.id, { fields });
          await patchCol(repCol.id, { viewRule: "" });
        } else {
          await createCol({
            name: 'reportes_generados', type: 'base',
            listRule: '@request.auth.id != ""', viewRule: "",
            fields: [
              { name: 'operador_id', type: 'text', required: true },
              { name: 'tipo', type: 'text', required: true },
              { name: 'formato', type: 'text', required: true },
              { name: 'archivo', type: 'file', options: { maxSelect: 1 } },
              { name: 'snapshot', type: 'json' }
            ]
          });
        }
        this.log('  ✅ Colecciones de soporte verificadas.');
      } catch (e) { this.log('  ⚠ Error en colecciones de soporte.'); }

      // ── 6. configuracion_sistema ─────────────────────────────────────
      try {
        this.log('');
        this.log('⏳ [6/7] Verificando "configuracion_sistema"...');
        const configCol = await getCol('configuracion_sistema');
        if (!configCol) {
          await createCol({
            name: 'configuracion_sistema', type: 'base',
            listRule: '', viewRule: '',
            createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""',
            fields: [
              { name: 'clave', type: 'text', required: true, unique: true },
              { name: 'valores', type: 'text', required: false }
            ]
          });
          await this.pbService.pb.collection('configuracion_sistema').create({ clave: 'tramites', valores: JSON.stringify(['OBTENCIÓN', 'REVALIDACIÓN', 'DUPLICADO', 'RECATEGORIZACIÓN']) });
          await this.pbService.pb.collection('configuracion_sistema').create({ clave: 'categorias', valores: JSON.stringify(['A-I', 'A-IIa', 'A-IIb', 'A-IIIa', 'A-IIIb', 'A-IIIc', 'B-I', 'B-IIa', 'B-IIb', 'B-IIc']) });
        }
        this.log('  ✅ "configuracion_sistema" verificado.');
      } catch (e: any) { this.log(`  ❌ Error config: ${e.message}`); }

      // ── 7. Migración de Datos ──────────────────────────────────────────
      try {
        this.log('');
        this.log('🔄 [7/7] Sincronizando datos...');
        if (expCol) {
          // Solo intentamos migrar si el campo legacy existe en el esquema actual
          const hasLegacy = expCol.fields?.some((f: any) => f.name === 'operador_legacy');
          if (hasLegacy) {
            const legacy = await this.pbService.pb.collection(expId).getFullList({
              filter: 'operador_legacy != ""',
              requestKey: 'mig'
            }).catch(() => []);

            let migrated = 0;
            for (const rec of legacy) {
              if (!rec['operador']) {
                await this.pbService.pb.collection(expId).update(rec.id, {
                  operador: rec['operador_legacy']
                }).catch(() => { });
                migrated++;
              }
            }
            if (migrated > 0) this.log(`  📦 Migrados ${migrated} expedientes.`);
          }
        }
        this.log('  ✅ Datos sincronizados.');
      } catch (e) { }

      this.log('');
      this.log('🎉 Sincronización Exitosa.');
    } catch (err: any) {
      this.log(`❌ Error crítico: ${err.message}`);
    } finally {
      this.isRunning.set(false);
    }
  }

  async generarBackup() {
    if (this.isRunning()) return;
    this.isRunning.set(true);
    this.logs.set([]);
    try {
      const { email, password } = this.form.value;
      const authRes = await fetch(this.pbService.pb.baseURL + '/api/collections/_superusers/auth-with-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password })
      });
      if (!authRes.ok) throw new Error('Auth fallida');
      const { token } = await authRes.json();
      const name = `backup_${new Date().getTime()}.zip`;
      await fetch(this.pbService.pb.baseURL + '/api/backups', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name })
      });
      this.log('✅ Backup generado.');
      this.backupReady.set(true);
    } catch (e: any) { this.log(`❌ Error: ${e.message}`); }
    finally { this.isRunning.set(false); }
  }

  abrirPanelAdmin() {
    const adminUrl = window.location.protocol + '//' + window.location.hostname + ':8095/_/';
    window.open(adminUrl, '_blank');
  }

  async resetAll() {
    if (this.isRunning() || !confirm('¿BORRAR TODO?')) return;
    this.isRunning.set(true);
    this.logs.set([]);
    try {
      const { email, password } = this.form.value;
      const authRes = await fetch(this.pbService.pb.baseURL + '/api/collections/_superusers/auth-with-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password })
      });
      const { token } = await authRes.json();
      const collections = ['reportes_generados', 'historial_acciones', 'expedientes'];
      for (const col of collections) {
        const data = await (await fetch(this.pbService.pb.baseURL + `/api/collections/${col}/records?perPage=500`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
        if (data.items) for (const it of data.items) await fetch(this.pbService.pb.baseURL + `/api/collections/${col}/records/${it.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      }
      this.log('✅ Datos base borrados.');
      await this.iniciarSync();
    } catch (e: any) { this.log(`❌ Error: ${e.message}`); }
    finally { this.isRunning.set(false); }
  }

  async generarDatosEjemplo() {
    if (this.isRunning()) return;
    this.isRunning.set(true);
    try {
      const { email, password } = this.form.value;
      const adminClient = new PocketBase(this.pbService.pb.baseURL);
      await adminClient.admins.authWithPassword(email!, password!);
      await this.seedService.seedRealisticData(adminClient);
      this.log('✅ Datos generados.');
    } catch (e: any) { this.log(`❌ Error: ${e.message}`); }
    finally { this.isRunning.set(false); }
  }

  async limpiarDatosEjemplo() {
    if (this.isRunning() || !confirm('¿Limpiar ejemplos?')) return;
    this.isRunning.set(true);
    try {
      const { email, password } = this.form.value;
      const adminClient = new PocketBase(this.pbService.pb.baseURL);
      await adminClient.admins.authWithPassword(email!, password!);
      await this.seedService.clearSampleData(adminClient);
      this.log('✅ Ejemplos limpios.');
    } catch (e: any) { this.log(`❌ Error: ${e.message}`); }
    finally { this.isRunning.set(false); }
  }
}


// ─── Configuraciones Page ─────────────────────────────────────────────────────
@Component({
  selector: 'app-configuraciones',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, MatDialogModule],
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
        <p>Instancia o actualiza las colecciones con esquemas aptos para PocketBase v0.23:</p>
        <ul>
          <li><code>expedientes</code> — incluye <strong>dni_solicitante, tramite, lugar_entrega, etc</strong></li>
          <li><code>operadores</code> — usa <strong>dni, nombre, sede y perfil</strong> (Auth collection)</li>
          <li><code>historial_acciones</code> — define todos los parámetros de logueo de auditoría</li>
          <li><code>reportes_generados</code> — guarda <strong>snapshot</strong> e incluye el acceso público por QR</li>
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
          <div class="flow-item"><span class="badge veri">VERIFICADO</span><span>El <strong>Supervisor</strong> realiza el control de calidad</span></div>
          <div class="flow-item"><span class="badge entr">ENTREGADO</span><span>El <strong>Entregador</strong> confirma la entrega al usuario</span></div>
          <div class="flow-item"><span class="badge aten">ATENDIDO</span><span>Expediente cerrado y archivado (Cierre diario)</span></div>
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

    <!-- Card 4: Gestión de Sedes -->
    <mat-card class="settings-card mat-elevation-z3">
      <mat-card-header>
        <mat-icon mat-card-avatar color="accent">business</mat-icon>
        <mat-card-title>Gestión de Sedes (Dinámico)</mat-card-title>
        <mat-card-subtitle>Añadir nuevas sucursales u oficinas</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div style="margin-top: 16px; margin-bottom: 8px; display: flex; gap: 8px;">
           <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>Nueva Sede (Ej: PATALLANI)</mat-label>
              <input matInput [formControl]="nuevaSedeCtrl" (keyup.enter)="agregarSede()" style="text-transform: uppercase;">
           </mat-form-field>
           <button mat-flat-button color="primary" [disabled]="!nuevaSedeCtrl.value || isLoadingSedes()" (click)="agregarSede()" style="height: 56px;">
             <mat-icon>add</mat-icon> Agregar
           </button>
        </div>

        @if(isLoadingSedes()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        }

        <table class="perfiles-table">
          <tr><th>Sede Nombre</th><th style="width: 50px; text-align: center;">Acciones</th></tr>
          @for(sede of sedes(); track sede.id) {
            <tr>
              <td><strong>{{sede['nombre']}}</strong></td>
              <td style="text-align: center;">
                <button mat-icon-button color="warn" (click)="eliminarSede(sede.id, sede['nombre'])"><mat-icon>delete</mat-icon></button>
              </td>
            </tr>
          }
          @if(!isLoadingSedes() && sedes().length === 0) {
            <tr><td colspan="2" style="text-align: center; color: #888;">No hay sedes registradas.</td></tr>
          }
        </table>
      </mat-card-content>
    </mat-card>

    <!-- Card 5: Opciones de Formulario -->
    <mat-card class="settings-card mat-elevation-z3">
      <mat-card-header>
        <mat-icon mat-card-avatar color="primary">tune</mat-icon>
        <mat-card-title>Opciones de Formulario</mat-card-title>
        <mat-card-subtitle>Configura los Tipos de Trámite y Categorías disponibles</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <!-- Tramites -->
        <h4 style="margin: 16px 0 8px; color: #0a3d62;">Tipos de Trámite</h4>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <mat-form-field appearance="outline" style="flex: 1;">
            <mat-label>Nuevo Trámite (ej: ESPECIAL)</mat-label>
            <input matInput [formControl]="nuevoTramiteCtrl" (keyup.enter)="agregarOpcion('tramites', nuevoTramiteCtrl)" style="text-transform: uppercase;">
          </mat-form-field>
          <button mat-flat-button color="primary" (click)="agregarOpcion('tramites', nuevoTramiteCtrl)" [disabled]="!nuevoTramiteCtrl.value" style="height:56px;">
            <mat-icon>add</mat-icon>
          </button>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          @for(t of tramiteOpciones(); track t) {
            <span style="background:#e0f2fe;color:#0284c7;padding:4px 10px;border-radius:12px;font-size:0.8rem;display:flex;align-items:center;gap:4px;">
              {{t}}
              <mat-icon style="font-size:14px;cursor:pointer;" (click)="eliminarOpcion('tramites', t)">close</mat-icon>
            </span>
          }
        </div>

        <!-- Categorias -->
        <h4 style="margin: 16px 0 8px; color: #0a3d62;">Categorías MTC</h4>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <mat-form-field appearance="outline" style="flex: 1;">
            <mat-label>Nueva Categoría (ej: C-I)</mat-label>
            <input matInput [formControl]="nuevaCategoriaCtrl" (keyup.enter)="agregarOpcion('categorias', nuevaCategoriaCtrl)">
          </mat-form-field>
          <button mat-flat-button color="primary" (click)="agregarOpcion('categorias', nuevaCategoriaCtrl)" [disabled]="!nuevaCategoriaCtrl.value" style="height:56px;">
            <mat-icon>add</mat-icon>
          </button>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          @for(c of categoriaOpciones(); track c) {
            <span style="background:#f0fdf4;color:#15803d;padding:4px 10px;border-radius:12px;font-size:0.8rem;display:flex;align-items:center;gap:4px;">
              {{c}}
              <mat-icon style="font-size:14px;cursor:pointer;" (click)="eliminarOpcion('categorias', c)">close</mat-icon>
            </span>
          }
        </div>
      </mat-card-content>
    </mat-card>

    <!-- Card 6: Cierre de Día (Automatismo 23:55) -->
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

    <!-- Card 7: Datos de Prueba -->
    <mat-card class="settings-card mat-elevation-z3 accent-card">
      <mat-card-header>
        <mat-icon mat-card-avatar color="accent">auto_awesome</mat-icon>
        <mat-card-title>Datos de Prueba / Demostración</mat-card-title>
        <mat-card-subtitle>Poblar sistema con información realista</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <p>Genera automáticamente una estructura de datos completa para pruebas en Licencias:</p>
        <ul>
          <li><strong>Sedes:</strong> Puno y Juliaca con flag de entrega.</li>
          <li><strong>Operadores:</strong> Cuentas de prueba para cada rol del sistema.</li>
          <li><strong>Expedientes:</strong> 12 trámites de licencias con historial de acciones.</li>
        </ul>
        <div style="background:#fff3e0;padding:12px;border-radius:8px;font-size:0.85rem;margin-top:8px;color:#e65100;">
           <mat-icon inline style="vertical-align:middle;font-size:16px;">verified</mat-icon> 
           Todos los datos se marcan de forma segura y pueden quitarse en cualquier momento.
        </div>
      </mat-card-content>
      <mat-card-actions align="end">
        <button mat-raised-button color="accent" (click)="openInitModal()">
          <mat-icon>manage_search</mat-icon> Gestionar Datos Ejemplo
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
    .badge.veri { background: #dcfce7; color: #15803d; }
    .badge.aten { background: #ccfbf1; color: #0f766e; border: 1px solid #99f6e4; }
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
export class ConfiguracionesComponent implements OnInit {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private pbService = inject(PocketbaseService);
  private expedienteService = inject(ExpedienteService);

  processingCierre = signal(false);

  sedes = signal<any[]>([]);
  nuevaSedeCtrl = new FormControl('');
  isLoadingSedes = signal(false);

  // Configurable selects
  tramiteOpciones = signal<string[]>([]);
  categoriaOpciones = signal<string[]>([]);
  nuevoTramiteCtrl = new FormControl('');
  nuevaCategoriaCtrl = new FormControl('');
  private configIds: Record<string, string> = {};

  ngOnInit() {
    this.cargarSedes();
    this.cargarOpciones();
  }

  async cargarSedes() {
    this.isLoadingSedes.set(true);
    try {
      const records = await this.pbService.pb.collection('sedes').getFullList({ sort: 'nombre' });
      this.sedes.set(records);
    } catch (e: any) {
      if (e.status !== 404 && e.status !== 403) this.snackBar.open('Error cargando sedes: ' + e.message, 'Cerrar');
    } finally {
      this.isLoadingSedes.set(false);
    }
  }

  async agregarSede() {
    const val = this.nuevaSedeCtrl.value?.trim().toUpperCase();
    if (!val) return;
    this.isLoadingSedes.set(true);
    try {
      await this.pbService.pb.collection('sedes').create({ nombre: val });
      this.snackBar.open(`Sede ${val} agregada correctamente`, 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
      this.nuevaSedeCtrl.setValue('');
      await this.cargarSedes();
    } catch (e: any) {
      this.snackBar.open('Error al agregar sede (Revisa si ya existe).', 'Cerrar', { duration: 4000 });
      this.isLoadingSedes.set(false);
    }
  }

  async eliminarSede(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la sede ${nombre}? Afectará los reportes si ya hay expedientes asignados a ella.`)) return;
    this.isLoadingSedes.set(true);
    try {
      await this.pbService.pb.collection('sedes').delete(id);
      this.snackBar.open(`Sede ${nombre} eliminada.`, 'OK', { duration: 3000 });
      await this.cargarSedes();
    } catch (e: any) {
      this.snackBar.open('Error al eliminar sede: ' + e.message, 'Cerrar', { duration: 4000 });
      this.isLoadingSedes.set(false);
    }
  }

  async cargarOpciones() {
    try {
      const recs = await this.pbService.pb.collection('configuracion_sistema').getFullList();
      for (const r of recs) {
        this.configIds[r['clave']] = r.id;
        const vals = JSON.parse(r['valores'] || '[]');
        if (r['clave'] === 'tramites') this.tramiteOpciones.set(vals);
        if (r['clave'] === 'categorias') this.categoriaOpciones.set(vals);
      }
    } catch (e) { /* colección puede no existir aún */ }
  }

  async agregarOpcion(clave: 'tramites' | 'categorias', ctrl: FormControl) {
    const val = ctrl.value?.trim().toUpperCase();
    if (!val) return;
    const signal = clave === 'tramites' ? this.tramiteOpciones : this.categoriaOpciones;
    const current = signal();
    if (current.includes(val)) { this.snackBar.open('Ya existe ese valor.', '', { duration: 2000 }); return; }
    const updated = [...current, val];
    await this.guardarOpcion(clave, updated, signal);
    ctrl.setValue('');
  }

  async eliminarOpcion(clave: 'tramites' | 'categorias', val: string) {
    const signal = clave === 'tramites' ? this.tramiteOpciones : this.categoriaOpciones;
    const updated = signal().filter(v => v !== val);
    await this.guardarOpcion(clave, updated, signal);
  }

  private async guardarOpcion(clave: string, values: string[], sig: any) {
    try {
      const id = this.configIds[clave];
      const payload = { clave, valores: JSON.stringify(values) };
      if (id) {
        await this.pbService.pb.collection('configuracion_sistema').update(id, payload);
      } else {
        const r = await this.pbService.pb.collection('configuracion_sistema').create(payload);
        this.configIds[clave] = r.id;
      }
      sig.set(values);
      this.snackBar.open('Guardado correctamente', 'OK', { duration: 2000 });
    } catch (e: any) {
      this.snackBar.open('Error al guardar: ' + e.message, 'Cerrar', { duration: 4000 });
    }
  }

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
