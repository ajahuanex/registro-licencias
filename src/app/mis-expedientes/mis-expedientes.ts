import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RecordModel } from 'pocketbase';
import { ExpedienteService, ExpedienteCreate } from '../core/services/expediente.service';
import { AuthService } from '../core/services/auth.service';
import { PocketbaseService } from '../core/services/pocketbase.service';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ===== MODAL COMPONENT =====
import { Component as CompDeco, Inject } from '@angular/core';

@CompDeco({
  selector: 'app-expediente-form-modal',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatDialogModule
  ],
  template: `
<h2 mat-dialog-title>{{ data?.id ? 'Editar Expediente' : 'Nuevo Expediente' }}</h2>
<mat-dialog-content>
  <form [formGroup]="form" class="form-grid">
    <mat-form-field appearance="outline" class="two-col"><mat-label>Apellidos y Nombres Completos</mat-label>
      <input matInput formControlName="apellidos_nombres" placeholder="APELLIDO NOMBRE">
      <mat-icon matPrefix>person</mat-icon>
    </mat-form-field>
    <mat-form-field appearance="outline"><mat-label>DNI del Solicitante</mat-label>
      <input matInput formControlName="dni_solicitante" maxlength="8">
      <mat-icon matPrefix>badge</mat-icon>
      @if(form.controls.dni_solicitante.hasError('pattern')&&form.controls.dni_solicitante.touched){<mat-error>Debe tener 8 dígitos</mat-error>}
    </mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Tipo de Trámite</mat-label>
      <mat-select formControlName="tramite">
        @for(t of tramites; track t){<mat-option [value]="t">{{t}}</mat-option>}
      </mat-select><mat-icon matPrefix>description</mat-icon>
    </mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Categoría</mat-label>
      <mat-select formControlName="categoria">
        @for(c of categorias; track c){<mat-option [value]="c">{{c}}</mat-option>}
      </mat-select><mat-icon matPrefix>drive_eta</mat-icon>
    </mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Lugar de Entrega</mat-label>
      <mat-select formControlName="lugar_entrega">
        @for(l of lugares; track l){<mat-option [value]="l">{{l}}</mat-option>}
      </mat-select><mat-icon matPrefix>location_on</mat-icon>
    </mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Estado</mat-label>
      <mat-select formControlName="estado">
        @for(e of estados; track e){<mat-option [value]="e">{{e}}</mat-option>}
      </mat-select><mat-icon matPrefix>pending_actions</mat-icon>
    </mat-form-field>
    <mat-form-field appearance="outline" class="full-row">
      <mat-label>Observaciones (Opcional)</mat-label>
      <textarea matInput formControlName="observaciones" rows="3"></textarea>
      <mat-icon matPrefix>notes</mat-icon>
    </mat-form-field>
  </form>
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button mat-dialog-close>Cancelar</button>
  <button mat-flat-button color="primary" [disabled]="form.invalid || saving()" (click)="onSubmit()">
    {{ saving() ? 'Guardando...' : (data?.id ? 'Guardar Cambios' : 'Registrar') }}
  </button>
</mat-dialog-actions>
  `,
  styles: [`
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.75rem 1.25rem;
      padding-top: 1rem;
      width: 100%;
    }
    .full-row { grid-column: 1 / -1; }
    .two-col  { grid-column: span 2; }
    mat-form-field { width: 100%; }
  `]
})
export class ExpedienteFormModal {
  tramites = ['Duplicado', 'Revalidación'];
  estados = ['EN PROCESO', 'ATENDIDO', 'OBSERVADO', 'RECHAZADO', 'ANULADO'];
  categorias = ['AI', 'AIIA', 'AIIB', 'AIIIC'];
  lugares = ['Puno', 'Juliaca'];
  saving = signal(false);

  form = inject(FormBuilder).group({
    dni_solicitante: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    apellidos_nombres: ['', [Validators.required, Validators.minLength(3)]],
    tramite: ['Duplicado', Validators.required],
    estado: ['EN PROCESO', Validators.required],
    categoria: ['AI', Validators.required],
    lugar_entrega: ['Puno', Validators.required],
    observaciones: ['']
  });

  private pbService = inject(PocketbaseService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  dialogRef = inject(MatDialogRef<ExpedienteFormModal>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: RecordModel | null) {
    if (data?.id) {
      this.form.patchValue({
        dni_solicitante: data['dni_solicitante'],
        apellidos_nombres: data['apellidos_nombres'],
        tramite: data['tramite'],
        estado: data['estado'],
        categoria: data['categoria'],
        lugar_entrega: data['lugar_entrega'],
        observaciones: data['observaciones'] || ''
      });
    }
  }

  async onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    try {
      const val = this.form.value;
      const payload: any = {
        dni_solicitante: val.dni_solicitante!.trim(),
        apellidos_nombres: val.apellidos_nombres!.trim().toUpperCase(),
        tramite: val.tramite!,
        estado: val.estado!,
        categoria: val.categoria!,
        lugar_entrega: val.lugar_entrega!,
        observaciones: val.observaciones || ''
      };

      if (this.data?.id) {
        await this.pbService.pb.collection('expedientes').update(this.data.id, payload);
        this.snackBar.open('Expediente actualizado', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
      } else {
        const user = this.authService.currentUser();
        payload.operador = user!.id;
        payload.fecha_registro = new Date().toISOString();
        await this.pbService.pb.collection('expedientes').create(payload);
        this.snackBar.open('Expediente registrado exitosamente', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
      }
      this.dialogRef.close(true);
    } catch (e: any) {
      this.snackBar.open('Error: ' + e.message, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
    } finally {
      this.saving.set(false);
    }
  }
}

// ===== MAIN COMPONENT =====
@Component({
  selector: 'app-mis-expedientes',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatCardModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSnackBarModule, MatTooltipModule
  ],
  templateUrl: './mis-expedientes.html',
  styleUrl: './mis-expedientes.scss'
})
export class MisExpedientes implements OnInit {
  private authService = inject(AuthService);
  private expedienteService = inject(ExpedienteService);
  private pbService = inject(PocketbaseService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private titleService = inject(Title);

  dataSource = new MatTableDataSource<RecordModel>([]);
  isLoading = signal(true);
  currentDate = new Date();
  
  displayedColumns = ['num', 'dni_solicitante', 'apellidos_nombres', 'tramite', 'categoria', 'estado', 'lugar_entrega', 'acciones'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  async ngOnInit() {
    this.titleService.setTitle('Mis Expedientes | DRTC Puno');
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const user = this.authService.currentUser();
      if (!user) return;
      const dateString = new Date().toISOString().split('T')[0];
      const records = await this.expedienteService.getDailyConsolidated(dateString, user.id);
      this.dataSource.data = records;
      setTimeout(() => {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      });
    } catch (e: any) {
      this.snackBar.open('Error al cargar expedientes: ' + e.message, 'Cerrar', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  openModal(record?: RecordModel) {
    const ref = this.dialog.open(ExpedienteFormModal, {
      width: '90vw',
      maxWidth: '920px',
      disableClose: true,
      data: record ?? null
    });
    ref.afterClosed().subscribe(saved => { if (saved) this.loadData(); });
  }

  async deleteExpediente(id: string) {
    if (!confirm('¿Eliminar este expediente? Esta acción no se puede deshacer.')) return;
    this.isLoading.set(true);
    try {
      await this.pbService.pb.collection('expedientes').delete(id);
      this.snackBar.open('Expediente eliminado', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
      await this.loadData();
    } catch (e: any) {
      this.snackBar.open('Error al eliminar: ' + e.message, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
      this.isLoading.set(false);
    }
  }

  exportExcel() {
    const rows = this.dataSource.data.map((r, i) => ({
      'N°': i + 1,
      'DNI Solicitante': r['dni_solicitante'],
      'Apellidos y Nombres': r['apellidos_nombres'],
      'Trámite': r['tramite'],
      'Categoría': r['categoria'],
      'Estado': r['estado'],
      'Lugar Entrega': r['lugar_entrega'],
      'Observaciones': r['observaciones'] || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mis Expedientes');
    XLSX.writeFile(wb, `mis_expedientes_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const user = this.authService.currentUser();
    const date = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFontSize(14);
    doc.text('DRTC PUNO - Mis Expedientes del Día', 14, 15);
    doc.setFontSize(10);
    doc.text(`Operador: ${user?.['nombre'] || 'N/A'} | Fecha: ${date}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['N°', 'DNI Solicitante', 'Apellidos y Nombres', 'Trámite', 'Categoría', 'Estado', 'Lugar']],
      body: this.dataSource.data.map((r, i) => [
        i + 1, r['dni_solicitante'], r['apellidos_nombres'],
        r['tramite'], r['categoria'], r['estado'], r['lugar_entrega']
      ]),
      headStyles: { fillColor: [10, 61, 98] },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [244, 247, 246] }
    });

    doc.save(`mis_expedientes_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  get totalRegistros() { return this.dataSource.data.length; }
}
