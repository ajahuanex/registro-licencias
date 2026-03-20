import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import PocketBase from 'pocketbase';
import { PocketbaseService } from '../core/services/pocketbase.service';

@Component({
  selector: 'app-admin-auth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatProgressBarModule],
  template: `
    <h2 mat-dialog-title>Seguridad: Super Admin</h2>
    <mat-dialog-content>
      <p style="margin-bottom: 20px; color: #555;">La alteración de la base de datos requiere credenciales primarias del servicio PocketBase.</p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="w-100" style="width: 100%">
          <mat-label>Email Admin PocketBase</mat-label>
          <input matInput formControlName="email" type="email">
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-100" style="width: 100%">
          <mat-label>Contraseña Admin</mat-label>
          <input matInput formControlName="password" type="password">
        </mat-form-field>
      </form>

      @if (logs().length > 0) {
        <div class="logs-container" style="background: #1e1e1e; color: #00ff00; font-family: monospace; padding: 10px; border-radius: 4px; font-size: 12px; height: 150px; overflow-y: auto;">
          @for (log of logs(); track $index) {
            <div>> {{ log }}</div>
          }
        </div>
      }
      @if (isRunning()) {
        <mat-progress-bar mode="indeterminate" style="margin-top: 10px;"></mat-progress-bar>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="isRunning()">Cancelar</button>
      <button mat-flat-button color="warn" [disabled]="form.invalid || isRunning()" (click)="iniciarSync()">
        Iniciar Sincronización
      </button>
    </mat-dialog-actions>
  `
})
export class AdminAuthModal {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AdminAuthModal>);
  private pbService = inject(PocketbaseService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  logs = signal<string[]>([]);
  isRunning = signal(false);

  addLog(msg: string) {
    this.logs.update(l => [...l, msg]);
  }

  async iniciarSync() {
    if (this.form.invalid) return;
    this.isRunning.set(true);
    this.logs.set([]);

    const { email, password } = this.form.value;
    // Separate Pocketbase instance using the same URL to not pollute auth
    const pb = new PocketBase("http://127.0.0.1:8090");

    try {
      this.addLog('Autenticando...');
      await pb.admins.authWithPassword(email!, password!);
      this.addLog('✅ Autenticado correctamente como Admin.');

      // 1. SKIP OPERADORES SCHEMA MUTATION (Done manually by user)
      try {
        const opCol = await pb.collections.getOne('operadores') as any;
        // Solo asegurar la regla de visualización
        if (opCol.listRule !== "@request.auth.id != ''") {
           opCol.listRule = "@request.auth.id != ''";
           opCol.viewRule = "@request.auth.id != ''";
           await pb.collections.update('operadores', opCol);
           this.addLog('✅ Reglas de privacidad de "operadores" actualizadas (List Rule abierta).');
        } else {
           this.addLog('✅ Reglas de "operadores" correctas.');
        }
      } catch (e: any) { this.addLog('❌ Error chequeando "operadores": ' + (e.data?.message || e.message) + ' ' + JSON.stringify(e.data?.data || {})); }

      // 2. UPDATE EXPEDIENTES
      try {
        const expCol = await pb.collections.getOne('expedientes') as any;
        const schemaObjExp = expCol.schema || expCol.fields; // SOPORTE MULTI-VERSION

        const estadoField = schemaObjExp.find((f: any) => f.name === 'estado');
        if (!estadoField) {
          this.addLog('⏳ Añadiendo "estado" a expedientes...');
          schemaObjExp.push({
             name: "estado", type: "select", required: true,
             presentable: false, unique: false, 
             options: { maxSelect: 1, values: ["EN PROCESO", "VERIFICADO", "ATENDIDO", "ENTREGADO", "OBSERVADO", "RECHAZADO", "ANULADO"] },
             maxSelect: 1, values: ["EN PROCESO", "VERIFICADO", "ATENDIDO", "ENTREGADO", "OBSERVADO", "RECHAZADO", "ANULADO"]
          });
          await pb.collections.update('expedientes', expCol);
          this.addLog('✅ Colección "expedientes" actualizada.');
        } else {
          const currentVals = estadoField.values || (estadoField.options && estadoField.options.values) || [];
          const reqValues = ["EN PROCESO", "VERIFICADO", "ATENDIDO", "ENTREGADO", "OBSERVADO", "RECHAZADO", "ANULADO"];
          const hasAll = reqValues.every(v => currentVals.includes(v));
          
          if (!hasAll) {
            const merged = Array.from(new Set([...currentVals, ...reqValues]));
            if (estadoField.options !== undefined || expCol.schema) {
              if (!estadoField.options) estadoField.options = {};
              estadoField.options.values = merged;
            }
            if (expCol.fields) {
              estadoField.values = merged;
            }
            await pb.collections.update('expedientes', expCol);
            this.addLog('✅ Opciones de "estado" comprobadas y actualizadas.');
          } else {
            this.addLog('✅ Colección "expedientes" ya tiene el estado completo.');
          }
        }
      } catch (e: any) { this.addLog('❌ Error chequeando "expedientes": ' + (e.data?.message || e.message) + ' ' + JSON.stringify(e.data?.data || {})); }

      // 3. CREATE HISTORIAL
      try {
        await pb.collections.getOne('historial_expedientes');
        this.addLog('✅ Colección "historial_expedientes" ya existe.');
      } catch (e: any) {
        if (e.status === 404) {
          this.addLog('⏳ Creando "historial_expedientes"...');
          await pb.collections.create({
            name: 'historial_expedientes', type: 'base',
            schema: [
              { name: 'expediente', type: 'relation', required: true, options: { collectionId: 'zxcvbnmasdfghjk', maxSelect: 1 } },
              { name: 'modificado_por', type: 'relation', required: true, options: { collectionId: 'q1w2e3r4t5y6u7i', maxSelect: 1 } },
              { name: 'accion', type: 'text', required: true },
              { name: 'detalles', type: 'text', required: false },
              { name: 'fecha', type: 'date', required: true }
            ],
            listRule: "@request.auth.id != ''",
            viewRule: "@request.auth.id != ''",
            createRule: "@request.auth.id != ''",
            updateRule: "@request.auth.id != ''"
          });
          this.addLog('✅ Colección "historial_expedientes" creada.');
        } else {
          this.addLog('❌ Error historial_expedientes: ' + e.message);
        }
      }

      this.addLog('🎉 Inicialización Completada. Ya puedes cerrar esta ventana manualmente.');

    } catch (err: any) {
      this.addLog('❌ Error: ' + err.message);
    } finally {
      this.isRunning.set(false);
      pb.authStore.clear(); // Ensure super admin logout
    }
  }
}

@Component({
  selector: 'app-configuraciones',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './configuraciones.component.html',
  styleUrl: './configuraciones.component.scss'
})
export class ConfiguracionesComponent {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  openInitModal() {
    this.dialog.open(AdminAuthModal, { width: '800px', maxWidth: '90vw', disableClose: true });
  }

  notImplementedYet() {
    this.snackBar.open('Esta función está en desarrollo (Próxima Versión).', 'Cerrar', { duration: 3000 });
  }
}
