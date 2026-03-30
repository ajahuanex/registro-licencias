import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RecordModel } from 'pocketbase';
import { ExpedienteService, ExpedienteCreate } from '../core/services/expediente.service';
import { AuthService } from '../core/services/auth.service';
import { PocketbaseService } from '../core/services/pocketbase.service';
import { ESTADOS_SISTEMA, ESTADOS_POR_PERFIL } from '../core/constants/app.constants';

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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';

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
    MatSelectModule, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule,
    MatCheckboxModule
  ],
  template: `
<h2 mat-dialog-title>
  {{ data?.id ? (isReadOnly() ? 'Detalles del Expediente (Bloqueado)' : 'Editar Expediente') : 'Nuevo Expediente' }}
</h2>
<mat-dialog-content>
  <form [formGroup]="form" class="form-grid">
    <mat-form-field appearance="outline"><mat-label>DNI del Solicitante</mat-label>
      <input matInput formControlName="dni_solicitante" maxlength="8" (keyup.enter)="searchDni()">
      <mat-icon matPrefix>badge</mat-icon>
      <button mat-icon-button matSuffix type="button" (click)="searchDni()" [disabled]="isSearchingDni()" matTooltip="Buscar en RENIEC (Próximamente)">
        <mat-icon>{{ isSearchingDni() ? 'hourglass_empty' : 'search' }}</mat-icon>
      </button>
      @if(form.controls.dni_solicitante.hasError('pattern')&&form.controls.dni_solicitante.touched){<mat-error>Debe tener 8 dígitos</mat-error>}
    </mat-form-field>
    <mat-form-field appearance="outline" class="two-col input-upper"><mat-label>Apellidos y Nombres Completos</mat-label>
      <input matInput formControlName="apellidos_nombres" placeholder="APELLIDO NOMBRE">
      <mat-icon matPrefix>person</mat-icon>
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
    <div class="registration-checks two-col">
      <mat-checkbox formControlName="reviso_sanciones">Sistema Nac. Sanciones (MTC)</mat-checkbox>
    </div>
    <mat-form-field appearance="outline" class="two-col">
      <mat-label>Observaciones / Justificación</mat-label>
      <textarea matInput formControlName="observaciones" rows="3" 
                [placeholder]="form.get('reviso_sanciones')?.value ? 'Notas opcionales...' : 'JUSTIFICACIÓN OBLIGATORIA: ¿Por qué no se revisó el sistema de sanciones?'"></textarea>
      <mat-icon matPrefix>notes</mat-icon>
      @if(form.get('observaciones')?.hasError('required') && form.get('observaciones')?.touched) {
        <mat-error>Debe justificar por qué no se revisó el sistema de sanciones o detallar la observación.</mat-error>
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
    .registration-checks {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      padding: 0.5rem;
      background: #f8fafc;
      border-radius: 8px;
    }
    .full-row { grid-column: 1 / -1; }
    .two-col  { grid-column: span 2; }
    mat-form-field { width: 100%; }
    mat-checkbox { color: #1a4f8f; font-weight: 500; }
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
  isSearchingDni = signal(false);

  // Diccionarios centralizados en app.constants.ts

  private authServiceModal = inject(AuthService);
  private expedienteService = inject(ExpedienteService);
  private pbService = inject(PocketbaseService);
  private snackBar = inject(MatSnackBar);
  dialogRef = inject(MatDialogRef<ExpedienteFormModal>);

  get estados(): string[] {
    const perfil = this.authServiceModal.currentUser()?.['perfil'] ?? '';
    return ESTADOS_POR_PERFIL[perfil] ?? [...ESTADOS_SISTEMA];
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
    reviso_sanciones: [false],
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
        reviso_sanciones: data['reviso_sanciones'] || false,
        observaciones: data['observaciones'] || ''
      });

      const user = this.authServiceModal.currentUser();
      const isPrivileged = user && ['IMPRESOR', 'SUPERVISOR', 'ADMINISTRADOR', 'OTI'].includes(user['perfil']);
      if (!isPrivileged && data['estado'] !== 'EN PROCESO') {
        this.isReadOnly.set(true);
        this.form.disable();
      }
    }

    // Logic for Observations requirement
    this.form.valueChanges.subscribe(() => {
      const estado = this.form.get('estado')?.value;
      const revisoSanciones = this.form.get('reviso_sanciones')?.value;
      const obsControl = this.form.get('observaciones');

      // Obligatorio si el estado es OBSERVADO O si NO se revisó sanciones
      if (estado === 'OBSERVADO' || !revisoSanciones) {
        obsControl?.setValidators([Validators.required, Validators.minLength(5)]);
      } else {
        obsControl?.clearValidators();
      }
      obsControl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  async searchDni() {
    const dni = this.form.get('dni_solicitante')?.value;
    if (!dni || dni.length !== 8) {
      this.snackBar.open('Ingrese un DNI válido de 8 dígitos', 'Cerrar', { duration: 3000 });
      return;
    }

    // TODO: Conectar a API real de RENIEC cuando esté disponible
    this.snackBar.open('La búsqueda automática de DNI estará disponible próximamente.', 'Entendido', { duration: 4000, panelClass: ['info-snackbar'] });
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
        reviso_sanciones: !!val.reviso_sanciones,
        observaciones: val.observaciones || ''
      };

      if (this.data?.id) {
        await this.expedienteService.updateExpediente(this.data.id, payload, 'EDICION_FORMULARIO');
        this.snackBar.open('Expediente actualizado', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
      } else {
        const user = this.authServiceModal.currentUser(); // fix-id-access-submit
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
    MatFormFieldModule, MatInputModule, MatCheckboxModule, MatMenuModule, MatTabsModule
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
  selection = new SelectionModel<RecordModel>(true, []);
  isLoading = signal(true);
  currentDate = new Date();
  activeTabIndex = 0;
  
  displayedColumns = ['select', 'num', 'dni_solicitante', 'apellidos_nombres', 'tramite', 'categoria', 'estado', 'observaciones', 'lugar_entrega', 'acciones'];
  columnOptions = [
    { key: 'dni_solicitante', label: 'DNI', visible: true },
    { key: 'apellidos_nombres', label: 'Nombres', visible: true },
    { key: 'tramite', label: 'Trámite', visible: true },
    { key: 'categoria', label: 'Cat.', visible: true },
    { key: 'estado', label: 'Estado', visible: true },
    { key: 'observaciones', label: 'OBS', visible: true },
    { key: 'lugar_entrega', label: 'Lugar', visible: true }
  ];

  atencionesDataSource = new MatTableDataSource<any>([]);
  atencionesColumns = ['num', 'fecha', 'dni', 'nombre', 'tramite', 'estado', 'ver'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  @ViewChild('atencionesPaginator') atencionesPaginator!: MatPaginator;
  @ViewChild('atencionesSort') atencionesSort!: MatSort;

  async ngOnInit() {
    this.titleService.setTitle('Mis Expedientes | DRTC Puno');
    await this.loadData();
    await this.loadAtenciones();
  }

  async loadAtenciones() {
    try {
      const user = this.authService.currentUser();
      if (!user) return;
      const data = await this.expedienteService.getMisAtenciones(user.id);
      this.atencionesDataSource.data = data;
      setTimeout(() => {
        this.atencionesDataSource.paginator = this.atencionesPaginator;
        this.atencionesDataSource.sort = this.atencionesSort;
      });
    } catch (e) {
      console.error('Error loadAtenciones:', e);
    }
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const user = this.authService.currentUser(); // fix-id-load
      if (!user) return;
      
      const year = this.currentDate.getFullYear();
      const month = String(this.currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(this.currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const isPrivileged = ['IMPRESOR', 'SUPERVISOR', 'ADMINISTRADOR', 'OTI'].includes(user['perfil']);
      const records = await this.expedienteService.getDailyConsolidated(dateString, isPrivileged ? undefined : user.id);
      this.dataSource.data = records;
      this.selection.clear();
      this.updateVisibleColumns();
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
    if (this.userPerfil === 'IMPRESOR') {
      this.snackBar.open('El Impresor no tiene permisos para eliminar registros.', 'Entendido', { duration: 3000 });
      return;
    }
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

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.dataSource.data);
  }

  async marcarComoImpreso(record: RecordModel) {
    try {
      this.isLoading.set(true);
      await this.expedienteService.updateExpediente(record.id, { estado: 'IMPRESO' }, 'MARCADO_RAPIDO_IMPRESO');
      this.snackBar.open('Expediente marcado como IMPRESO', 'Cerrar', { duration: 2000 });
      await this.loadData();
    } catch (e: any) {
      this.snackBar.open('Error: ' + e.message, 'Cerrar', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async marcarComoImpresoMasivo() {
    console.log('[BULK] CLICK DETECTADO');
    const selected = this.selection.selected;
    if (selected.length === 0) return;
    
    this.snackBar.open(`Procesando ${selected.length} expedientes...`, 'Ok', { duration: 2000 });

    this.isLoading.set(true);
    console.log('[BULK] Iniciando proceso para', selected.length, 'ítems');
    let successCount = 0;
    for (const item of selected) {
      if (item['estado'] === 'IMPRESO') {
        console.log('[BULK] Saltando ítem ya impreso:', item.id);
        continue;
      }
      try {
        console.log('[BULK] Procesando ítem:', item.id);
        await this.expedienteService.updateExpediente(item.id, { estado: 'IMPRESO' }, 'PROCESO_MASIVO_IMPRESOR');
        successCount++;
      } catch (e) {
        console.error('[BULK] Error al actualizar masivo:', item.id, e);
      }
    }
    console.log('[BULK] Finalizado. Éxitos:', successCount);
    this.snackBar.open(`${successCount} expedientes actualizados con éxito.`, 'Cerrar', { duration: 3000 });
    await this.loadData();
  }

  updateVisibleColumns() {
    const base = ['select', 'num'];
    const dynamic = this.columnOptions.filter(o => o.visible).map(o => o.key);
    this.displayedColumns = [...base, ...dynamic, 'acciones'];
  }

  get userPerfil() {
    return this.authService.currentUser()?.['perfil'] || '';
  }

  exportExcel() {
    try {
      const isHistory = this.activeTabIndex === 1;
      const dataToExport = isHistory ? this.atencionesDataSource.data : this.dataSource.data;

      if (dataToExport.length === 0) {
        this.snackBar.open('No hay datos para exportar.', 'Cerrar', { duration: 3000 });
        return;
      }
      
      let rows: any[] = [];
      if (isHistory) {
        rows = dataToExport.map((r, i) => ({
          'N°': i + 1,
          'Fecha/Hora': r.created ? new Date(r.created).toLocaleString('es-PE') : '',
          'DNI Solicitante': r['expediente_dni'] || '',
          'Expediente': r.expand?.expediente_id?.apellidos_nombres || 'Eliminado/Cargando',
          'Trámite': r.expand?.expediente_id?.tramite || '',
          'Estado': 'IMPRESO'
        }));
      } else {
        rows = dataToExport.map((r, i) => ({
          'N°': i + 1,
          'DNI Solicitante': r['dni_solicitante'],
          'Apellidos y Nombres': r['apellidos_nombres'],
          'Trámite': r['tramite'],
          'Categoría': r['categoria'],
          'Estado': r['estado'],
          'OBS': r['observaciones'] || '',
          'Lugar Entrega': r['lugar_entrega']
        }));
      }
      
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, isHistory ? 'Mis Atenciones' : 'Mis Expedientes');
      XLSX.writeFile(wb, `exportacion_${new Date().toISOString().split('T')[0]}.xlsx`);
      this.snackBar.open('Excel generado con éxito', 'Cerrar', { duration: 2000 });
    } catch (e: any) {
      console.error('[EXPORT-EXCEL] Error:', e);
      this.snackBar.open('Error al generar Excel: ' + e.message, 'Cerrar', { duration: 4000 });
    }
  }

  exportPDF() {
    try {
      const isHistory = this.activeTabIndex === 1;
      const dataToExport = isHistory ? this.atencionesDataSource.data : this.dataSource.data;

      if (dataToExport.length === 0) {
        this.snackBar.open('No hay datos para exportar.', 'Cerrar', { duration: 3000 });
        return;
      }
      const doc = new jsPDF({ orientation: 'landscape' });
      const user = this.authService.currentUser();
      const date = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const title = isHistory ? 'DRTC PUNO - Mis Atenciones (Historial)' : 'DRTC PUNO - Mis Expedientes del Día';
      doc.setFontSize(14);
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      doc.text(`Operador: ${user?.['nombre'] || 'N/A'} | Fecha: ${date}`, 14, 22);

      let head: string[][] = [];
      let body: any[][] = [];

      if (isHistory) {
        head = [['N°', 'Fecha/Hora', 'DNI Solic.', 'Expediente', 'Trámite', 'Estado']];
        body = dataToExport.map((r, i) => [
          i + 1,
          r.created ? new Date(r.created).toLocaleString('es-PE') : '',
          r['expediente_dni'] || '',
          r.expand?.expediente_id?.apellidos_nombres || 'Eliminado',
          r.expand?.expediente_id?.tramite || '',
          'IMPRESO'
        ]);
      } else {
        head = [['N°', 'DNI Solic.', 'Apellidos y Nombres', 'Trámite', 'Cat.', 'Estado', 'OBS', 'Lugar']];
        body = dataToExport.map((r, i) => [
          i + 1, 
          r['dni_solicitante'], 
          r['apellidos_nombres'],
          r['tramite'], 
          r['categoria'], 
          r['estado'],
          r['observaciones'] ? 'SI' : '',
          r['lugar_entrega']
        ]);
      }

      autoTable(doc, {
        startY: 28,
        head,
        body,
        headStyles: { fillColor: [10, 61, 98] },
        styles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [244, 247, 246] }
      });

      doc.save(`exportacion_${new Date().toISOString().split('T')[0]}.pdf`);
      this.snackBar.open('PDF generado con éxito', 'Cerrar', { duration: 2000 });
    } catch (e: any) {
      console.error('[EXPORT-PDF] Error:', e);
      this.snackBar.open('Error al generar PDF: ' + e.message, 'Cerrar', { duration: 4000 });
    }
  }

  get totalRegistros() { return this.dataSource.data.length; }
}
