import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';

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
<h2 mat-dialog-title>
  {{ data?.id ? (isReadOnly() ? 'Detalles del Expediente (Bloqueado)' : 'Editar Expediente') : 'Nuevo Expediente' }}
</h2>
<mat-dialog-content>
  <form [formGroup]="form" class="form-grid">
    <mat-form-field appearance="outline" class="two-col input-upper"><mat-label>Apellidos y Nombres Completos</mat-label>
      <input matInput formControlName="apellidos_nombres" placeholder="APELLIDO NOMBRE">
      <mat-icon matPrefix>person</mat-icon>
    </mat-form-field>
    <mat-form-field appearance="outline"><mat-label>DNI del Solicitante</mat-label>
      <input matInput formControlName="dni_solicitante" maxlength="8">
      <mat-icon matPrefix>badge</mat-icon>
      @if(form.controls.dni_solicitante.hasError('pattern')&&form.controls.dni_solicitante.touched){<mat-error>Debe tener 8 dígitos</mat-error>}
    </mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Celular (opcional)</mat-label>
      <input matInput formControlName="celular" maxlength="12" placeholder="9XXXXXXXX">
      <mat-icon matPrefix>phone</mat-icon>
    </mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Tipo de Trámite</mat-label>
      <mat-select formControlName="tramite" (selectionChange)="onTramiteChange()">
        @for(t of tramites; track t){<mat-option [value]="t">{{t}}</mat-option>}
      </mat-select><mat-icon matPrefix>description</mat-icon>
    </mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Categoría</mat-label>
      <mat-select formControlName="categoria">
        @for(c of categoriasDisponibles; track c.value){
          <mat-option [value]="c.value">{{c.label}}</mat-option>
        }
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
    <mat-form-field appearance="outline" class="two-col">
      <mat-label>Observaciones</mat-label>
      <textarea matInput formControlName="observaciones" rows="3" placeholder="Si el estado es OBSERVADO, ingrese el motivo aquí"></textarea>
      <mat-icon matPrefix>notes</mat-icon>
      @if(form.get('observaciones')?.hasError('required') && form.get('observaciones')?.touched) {
        <mat-error>El motivo de la observación es <strong>obligatorio</strong>.</mat-error>
      }
      @if(form.get('observaciones')?.hasError('minlength') && form.get('observaciones')?.touched) {
        <mat-error>Mínimo 5 caracteres permitidos.</mat-error>
      }
    </mat-form-field>
  </form>
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button mat-dialog-close>{{ isReadOnly() ? 'Cerrar' : 'Cancelar' }}</button>
  @if(!isReadOnly()){
    <button mat-flat-button color="primary" [disabled]="form.invalid || saving()" (click)="onSubmit()">
      {{ saving() ? 'Guardando...' : (data?.id ? 'Guardar Cambios' : 'Registrar') }}
    </button>
  }
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
  // Trámites según normativa MTC
  tramites = ['Obtención', 'Revalidación', 'Duplicado', 'Recategorización'];

  // Categorías completas MTC
  private static readonly TODAS_CATEGORIAS = [
    // Clase A — ordinarias
    { value: 'A-I',    label: 'A-I   — Vehículos particulares' },
    { value: 'A-IIa',  label: 'A-IIa — Taxis / transporte público menor' },
    { value: 'A-IIb',  label: 'A-IIb — Microbús / Minibús' },
    { value: 'A-IIIa', label: 'A-IIIa— Ómnibus (>6 ton)' },
    { value: 'A-IIIb', label: 'A-IIIb— Camión / Grúa / Remolque' },
    { value: 'A-IIIc', label: 'A-IIIc— Combinada A-I + A-II + A-III' },
    // Clase A — Especial (solo Obtención/Revalidación)
    { value: 'A-IV',   label: 'A-IV  — Especial Mat. Peligrosos' },
    // Clase B — menores
    { value: 'B-IIa',  label: 'B-IIa — Bicimotos de carga/pasajeros' },
    { value: 'B-IIb',  label: 'B-IIb — Motocicletas' },
    { value: 'B-IIc',  label: 'B-IIc — Mototaxi / Trimoto' },
  ];

  lugares = ['Puno', 'Juliaca'];
  saving = signal(false);
  isReadOnly = signal(false);

  private static readonly ESTADOS_POR_PERFIL: Record<string, string[]> = {
    // Registra expediente — solo puede marcar problemas
    REGISTRADOR:      ['EN PROCESO', 'OBSERVADO', 'RECHAZADO'],
    OPERADOR:         ['EN PROCESO', 'OBSERVADO', 'RECHAZADO'],
    // Supervisor de Impresión — imprime la licencia física
    SUP_IMPRESION:    ['IMPRESO', 'OBSERVADO', 'RECHAZADO'],
    // Supervisor de Control de Calidad — verifica impresión y datos; aprueba para entrega
    SUP_CALIDAD:      ['ATENDIDO', 'OBSERVADO', 'RECHAZADO'],
    // Supervisor genérico — acceso amplio
    SUPERVISOR:       ['EN PROCESO', 'IMPRESO', 'ATENDIDO', 'OBSERVADO', 'RECHAZADO', 'ANULADO'],
    // Entregador — solo confirma entrega física
    ENTREGADOR:       ['ENTREGADO'],
    // Administrador — control total
    ADMINISTRADOR:    ['EN PROCESO', 'IMPRESO', 'ATENDIDO', 'OBSERVADO', 'RECHAZADO', 'ENTREGADO', 'ANULADO'],
    // OTI — control total + configuraciones globales del sistema
    OTI:              ['EN PROCESO', 'IMPRESO', 'ATENDIDO', 'OBSERVADO', 'RECHAZADO', 'ENTREGADO', 'ANULADO'],
  };

  private authServiceModal = inject(AuthService);
  private expedienteService = inject(ExpedienteService);
  private pbService = inject(PocketbaseService);
  private snackBar = inject(MatSnackBar);
  dialogRef = inject(MatDialogRef<ExpedienteFormModal>);

  get estados(): string[] {
    const perfil = this.authServiceModal.currentUser()?.['perfil'] ?? '';
    return ExpedienteFormModal.ESTADOS_POR_PERFIL[perfil]
      ?? ['EN PROCESO', 'VERIFICADO', 'ATENDIDO', 'OBSERVADO', 'RECHAZADO', 'ENTREGADO', 'ANULADO'];
  }

  /** Categorías disponibles según el trámite seleccionado */
  get categoriasDisponibles() {
    const tramite = this.form.get('tramite')?.value ?? '';
    // DUPLICADO y RECATEGORIZACIÓN→ todas las categorías ordinarias (no A-IV)
    // OBTENCIÓN y REVALIDACIÓN → todas incluidas A-IV
    if (tramite === 'Duplicado' || tramite === 'Recategorización') {
      return ExpedienteFormModal.TODAS_CATEGORIAS.filter(c => c.value !== 'A-IV');
    }
    return ExpedienteFormModal.TODAS_CATEGORIAS;
  }

  form = inject(FormBuilder).group({
    dni_solicitante: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    apellidos_nombres: ['', [Validators.required, Validators.minLength(3)]],
    celular: [''],
    tramite: ['Obtención', Validators.required],
    estado: ['EN PROCESO', Validators.required],
    categoria: ['A-I', Validators.required],
    lugar_entrega: ['Puno', Validators.required],
    observaciones: ['']
  });

  /** When tramite changes, reset categoria to first valid option */
  onTramiteChange() {
    const disponibles = this.categoriasDisponibles;
    const current = this.form.get('categoria')?.value;
    if (!disponibles.find(c => c.value === current)) {
      this.form.get('categoria')?.setValue(disponibles[0]?.value ?? 'A-I');
    }
  }

  constructor(@Inject(MAT_DIALOG_DATA) public data: RecordModel | null) {
    if (data?.id) {
      this.form.patchValue({
        dni_solicitante: data['dni_solicitante'],
        apellidos_nombres: data['apellidos_nombres'],
        celular: data['celular'] || '',
        tramite: data['tramite'],
        estado: data['estado'],
        categoria: data['categoria'],
        lugar_entrega: data['lugar_entrega'],
        observaciones: data['observaciones'] || ''
      });

      const user = this.authServiceModal.currentUser();
      const isPrivileged = user && ['SUPERVISOR', 'ADMINISTRADOR', 'OTI'].includes(user['perfil']);
      if (!isPrivileged && data['estado'] !== 'EN PROCESO') {
        this.isReadOnly.set(true);
        this.form.disable();
      }
    }

    this.form.get('estado')?.valueChanges.subscribe(estado => {
      const obsControl = this.form.get('observaciones');
      if (estado === 'OBSERVADO') {
        obsControl?.setValidators([Validators.required, Validators.minLength(5)]);
      } else {
        obsControl?.clearValidators();
      }
      obsControl?.updateValueAndValidity();
    });
  }

  async onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    try {
      const val = this.form.value;
      const payload: any = {
        dni_solicitante: val.dni_solicitante!.trim(),
        apellidos_nombres: val.apellidos_nombres!.trim().toUpperCase(),
        celular: val.celular?.trim() || '',
        tramite: val.tramite!,
        estado: val.estado!,
        categoria: val.categoria!,
        lugar_entrega: val.lugar_entrega!,
        observaciones: val.observaciones || ''
      };

      if (this.data?.id) {
        await this.expedienteService.updateExpediente(this.data.id, payload, 'EDICION_FORMULARIO');
        this.snackBar.open('Expediente actualizado', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
      } else {
        const user = this.authServiceModal.currentUser();
        payload.operador = user!.id;
        payload.fecha_registro = new Date().toISOString();
        await this.expedienteService.registerExpediente(payload);
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
    CommonModule, FormsModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatCardModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSnackBarModule, MatTooltipModule, MatDatepickerModule, MatNativeDateModule,
    MatFormFieldModule, MatInputModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-PE' }
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
      
      const year = this.currentDate.getFullYear();
      const month = String(this.currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(this.currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
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
