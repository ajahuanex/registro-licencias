import { Component, inject, OnInit, signal, ViewChild, effect, TemplateRef, AfterViewInit, OnDestroy } from '@angular/core';
import { MainLayoutComponent } from '../layout/main-layout/main-layout.component';
import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RecordModel } from 'pocketbase';
import { ExpedienteService, ExpedienteCreate } from '../core/services/expediente.service';
import { AuthService } from '../core/services/auth.service';
import { PocketbaseService } from '../core/services/pocketbase.service';
import { ESTADOS_SISTEMA, ESTADOS_POR_PERFIL } from '../core/constants/app.constants';
import { ExpedienteTrackerComponent } from '../expedientes/expediente-tracker/expediente-tracker.component';

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

export const TRAMITES_MTC = ['OBTENCIÓN', 'REVALIDACIÓN', 'DUPLICADO', 'RECATEGORIZACIÓN'];
export const CATEGORIAS_MTC = [
  { value: 'A-I',    label: 'A-I   — Vehículos particulares' },
  { value: 'A-IIa',  label: 'A-IIa — Taxis / transporte público menor' },
  { value: 'A-IIb',  label: 'A-IIb — Microbús / Minibús' },
  { value: 'A-IIIa', label: 'A-IIIa— Ómnibus (>6 ton)' },
  { value: 'A-IIIb', label: 'A-IIIb — Camión / Grúa / Remolque' },
  { value: 'A-IIIc', label: 'A-IIIc— Combinada A-I + A-II + A-III' },
  { value: 'B-I',    label: 'B-I   — Triciclos / Mototaxis' },
  { value: 'B-IIa',  label: 'B-IIa — Bicimotos / Motocicletas' },
  { value: 'B-IIb',  label: 'B-IIb — Motocicletas con Sidecar' },
  { value: 'B-IIc',  label: 'B-IIc — Mototaxis / Trimóviles Pasajeros' }
];

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
        @for(t of tramites(); track t){<mat-option [value]="t">{{t}}</mat-option>}
      </mat-select><mat-icon matPrefix>description</mat-icon>
    </mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Categoría</mat-label>
      <mat-select formControlName="categoria">
        @for(c of categoriasDisponibles(); track c.value){
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
      <mat-checkbox formControlName="reviso_sanciones">Confirmo que revisé este DNI en el Sistema Nac. de Sanciones (MTC) sin papeletas pendientes</mat-checkbox>
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

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      .two-col {
        grid-column: 1 / -1 !important;
      }
      .registration-checks {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class ExpedienteFormModal implements OnInit {
  // Dynamic tramites/categorias loaded from `configuracion_sistema`
  tramites = signal<string[]>(TRAMITES_MTC);
  categoriasDisponibles = signal<{ value: string; label: string }[]>(CATEGORIAS_MTC);

  lugares: string[] = [];
  saving = signal(false);
  isReadOnly = signal(false);
  isSearchingDni = signal(false);

  data = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private authServiceModal = inject(AuthService);
  private expedienteService = inject(ExpedienteService);
  private pbService = inject(PocketbaseService);
  private snackBar = inject(MatSnackBar);
  dialogRef = inject(MatDialogRef<ExpedienteFormModal>);

  form = this.fb.group({
    dni_solicitante: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    apellidos_nombres: ['', Validators.required],
    celular: [''],
    tramite: ['', Validators.required],
    categoria: ['', Validators.required],
    lugar_entrega: ['', Validators.required],
    estado: ['EN PROCESO', Validators.required],
    reviso_sanciones: [false],
    observaciones: ['', [Validators.minLength(5)]]
  });

  async ngOnInit() {
    // Si hay data (edición), cargar valores
    if (this.data) {
      this.form.patchValue(this.data);
      if (this.data.reviso_sanciones) {
          this.form.get('observaciones')?.setValidators([Validators.minLength(5)]);
      } else {
          this.form.get('observaciones')?.setValidators([Validators.required, Validators.minLength(5)]);
      }
      this.form.get('observaciones')?.updateValueAndValidity();
    }

    // Dynamic validation for registration checks
    this.form.get('reviso_sanciones')?.valueChanges.subscribe(checked => {
      if (checked) {
        this.form.get('observaciones')?.setValidators([Validators.minLength(5)]);
      } else {
        this.form.get('observaciones')?.setValidators([Validators.required, Validators.minLength(5)]);
      }
      this.form.get('observaciones')?.updateValueAndValidity();
    });

    // Initial trigger for new records
    if (!this.data) {
       this.form.get('reviso_sanciones')?.updateValueAndValidity({ emitEvent: true });
    }

    try {
      const records = await this.pbService.pb.collection('sedes').getFullList({ sort: 'nombre' });
      this.lugares = records
           .filter(r => r['es_centro_entrega'] !== false)
           .map(r => r['nombre']);
      
      if (!this.data) {
        this.form.get('lugar_entrega')?.setValue(this.lugares[0] || 'PUNO');
      }
    } catch (e) {
      this.lugares = ['PUNO', 'JULIACA'];
      if (!this.form.get('lugar_entrega')?.value) this.form.get('lugar_entrega')?.setValue('PUNO');
    }

    // Load dynamic tramites & categorias
    try {
      const cfgRecs = await this.pbService.pb.collection('configuracion_sistema').getFullList();
      const tramCfg = cfgRecs.find(r => r['clave'] === 'tramites');
      const catCfg  = cfgRecs.find(r => r['clave'] === 'categorias');
      if (tramCfg) {
        const vals: string[] = JSON.parse(tramCfg['valores'] || '[]');
        if (vals.length) this.tramites.set(vals);
      }
      if (catCfg) {
        const vals: string[] = JSON.parse(catCfg['valores'] || '[]');
        if (vals.length) {
          // Map raw values to { value, label } — label same as value for dynamic entries
          const mapped = vals.map(v => {
            const found = CATEGORIAS_MTC.find(c => c.value === v);
            return found ?? { value: v, label: v };
          });
          this.categoriasDisponibles.set(mapped);
        }
      }
    } catch (_) { /* fallback to static constants already set */ }
  }

  get estados(): string[] {
    const perfil = this.authServiceModal.currentUser()?.['perfil'] ?? '';
    return ESTADOS_POR_PERFIL[perfil] ?? [...ESTADOS_SISTEMA];
  }

  onTramiteChange() {
    // Lógica opcional al cambiar trámite
  }

  async searchDni() {
    const dni = this.form.get('dni_solicitante')?.value;
    if (!dni || dni.length !== 8) return;

    this.isSearchingDni.set(true);
    try {
      // Simulación o llamada a API de búsqueda
      this.snackBar.open('Búsqueda de DNI no disponible en este entorno', 'OK', { duration: 2000 });
    } finally {
      this.isSearchingDni.set(false);
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      const val = this.form.value as any;
      if (this.data?.id) {
        await this.expedienteService.updateExpediente(this.data.id, val, 'MODIFICACION_REGISTRADOR');
      } else {
        const user = this.authServiceModal.currentUser();
        val.operador = user?.id;
        val.fecha_registro = new Date().toISOString();
        await this.expedienteService.registerExpediente(val);
      }
      this.dialogRef.close(true);
    } catch (e: any) {
      this.snackBar.open('Error: ' + e.message, 'Cerrar', { duration: 4000 });
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
    MatFormFieldModule, MatInputModule, MatCheckboxModule, MatMenuModule, MatTabsModule,
    MatSelectModule, ReactiveFormsModule
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
  public mainLayout = inject(MainLayoutComponent, { optional: true });

  @ViewChild('mobileFilters') mobileFiltersTemplate!: TemplateRef<any>;

  dataSource = new MatTableDataSource<RecordModel>([]);
  selection = new SelectionModel<RecordModel>(true, []);
  isLoading = signal(true);
  searchTerm = signal('');

  constructor() {
    effect(() => {
      const val = this.searchTerm();
      this.dataSource.filter = val.trim().toLowerCase();
      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }
    });
  }
  
  currentDate = new Date();
  
  // New Filter Signals
  selectedTramite = signal('TODAS');
  selectedCategoria = signal('TODAS');
  tramiteOptions = ['TODAS', ...TRAMITES_MTC];
  categoriaOptions = [{ value: 'TODAS', label: 'TODAS LAS CATEGORÍAS' }, ...CATEGORIAS_MTC];
  
  // Advanced Filter
  showAdvancedFilter = false;
  startDate: Date | null = null;
  endDate: Date | null = null;
  
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
  atencionesColumns = ['num', 'fecha', 'dni', 'nombre', 'tramite', 'lugar', 'estado_actual', 'revertir'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  @ViewChild('atencionesPaginator') atencionesPaginator!: MatPaginator;
  @ViewChild('atencionesSort') atencionesSort!: MatSort;

  async ngOnInit() {
    this.titleService.setTitle('Mis Expedientes | DRTC Puno');
    await this.loadData();
    if (['IMPRESOR', 'SUPERVISOR', 'ENTREGADOR', 'ADMINISTRADOR', 'OTI'].includes(this.userPerfil)) {
      await this.loadAtenciones();
    }
    
    // Register mobile filters
    if (this.mainLayout) {
      setTimeout(() => {
        if (this.mobileFiltersTemplate) {
          this.mainLayout?.mobileFilterTemplate.set(this.mobileFiltersTemplate);
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.mainLayout) {
      this.mainLayout.mobileFilterTemplate.set(null);
    }
  }

  async loadAtenciones() {
    try {
      const user = this.authService.currentUser();
      if (!user) return;
      const data = await this.expedienteService.getMisAtenciones(user.id);
      
      const dStart = (this.showAdvancedFilter && this.startDate) ? this.startDate : this.currentDate;
      const dEnd = (this.showAdvancedFilter && this.endDate) ? this.endDate : this.currentDate;
      
      const startOfDay = new Date(dStart);
      startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(dEnd);
      endOfDay.setHours(23,59,59,999);
      
      // Filter the data based on the current date view for daily report
      const dailyData = data.filter((item: any) => {
        const itemDate = new Date(item.fecha);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      });
      
      console.log("[DEBUG ATENCIONES] Fetched logs for date range:", startOfDay, "to", endOfDay);
      console.log("[DEBUG ATENCIONES] raw data:", data.length, "- daily filtered:", dailyData.length);

      this.atencionesDataSource.data = dailyData;
      setTimeout(() => {
        this.atencionesDataSource.paginator = this.atencionesPaginator;
        this.atencionesDataSource.sort = this.atencionesSort;
      });
    } catch (e) {
      console.error('Error loadAtenciones:', e);
    }
  }

  toggleAdvancedFilter() {
    this.showAdvancedFilter = !this.showAdvancedFilter;
    if (!this.showAdvancedFilter) {
      this.currentDate = new Date();
      this.loadData();
      if (['IMPRESOR', 'SUPERVISOR', 'ENTREGADOR', 'ADMINISTRADOR', 'OTI'].includes(this.userPerfil)) this.loadAtenciones();
    } else {
      this.startDate = this.currentDate;
      this.endDate = this.currentDate;
    }
  }

  applyRangeFilter() {
    if (this.startDate && this.endDate) {
      this.loadData();
      if (['IMPRESOR', 'SUPERVISOR', 'ENTREGADOR', 'ADMINISTRADOR', 'OTI'].includes(this.userPerfil)) this.loadAtenciones();
    }
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const user = this.authService.currentUser(); // fix-id-load
      if (!user) return;
      
      const originStart = (this.showAdvancedFilter && this.startDate) ? new Date(this.startDate) : new Date();
      originStart.setHours(0, 0, 0, 0); // Local start of day
      const startStr = originStart.toISOString().replace('T', ' ');

      const originEnd = (this.showAdvancedFilter && this.endDate) ? new Date(this.endDate) : new Date();
      originEnd.setHours(23, 59, 59, 999); // Local end of day
      const endStr = originEnd.toISOString().replace('T', ' ');

      let filterStr: string;
      let records: any[];

      // El SUPERVISOR ve TODOS los IMPRESOS pendientes sin restricción de fecha
      if (user['perfil'] === 'SUPERVISOR') {
        filterStr = `estado = "IMPRESO"`;
        records = await this.pbService.pb.collection('expedientes').getFullList({
          filter: filterStr,
          expand: 'operador',
          sort: '-fecha_registro'
        });
      } else if (user['perfil'] === 'ENTREGADOR') {
        // El ENTREGADOR ve TODOS los VERIFICADOS sin restricción de fecha, pero SOLO de su sede
        const userSede = user['sede'] ? user['sede'].toUpperCase() : '';
        filterStr = `estado = "VERIFICADO" && lugar_entrega = "${userSede}"`;
        records = await this.pbService.pb.collection('expedientes').getFullList({
          filter: filterStr,
          expand: 'operador',
          sort: '-fecha_registro'
        });
      } else {
        filterStr = `fecha_registro >= "${startStr}" && fecha_registro <= "${endStr}"`;
        
        const isPrivileged = ['IMPRESOR', 'SUPERVISOR', 'ADMINISTRADOR', 'OTI', 'DIRECTIVO'].includes(user['perfil']);
        if (!isPrivileged) {
            filterStr += ` && operador = '${user.id}'`;
        }

        // Apply dynamic filters
        if (this.selectedTramite() !== 'TODAS') {
          filterStr += ` && tramite = "${this.selectedTramite()}"`;
        }
        if (this.selectedCategoria() !== 'TODAS') {
          filterStr += ` && categoria = "${this.selectedCategoria()}"`;
        }
        
        records = await this.pbService.pb.collection('expedientes').getFullList({
            filter: filterStr,
            expand: 'operador',
            sort: '-fecha_registro'
        });
      }
      
      let tableData = records;
      
      // Ocultar de la tabla principal los expedientes que ya fueron IMPRESOS si eres SOLO IMPRESOR
      if (user['perfil'] === 'IMPRESOR') {
        tableData = records.filter(r => r['estado'] !== 'IMPRESO');
      }
      
      this.dataSource.data = tableData;
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

  canEdit(record: any): boolean {
    if (!record) return false;
    const userRole = this.userPerfil;
    
    // OTI has full access
    if (userRole === 'OTI') return true;
    
    // Block everyone else from ATENDIDO
    if (record['estado'] === 'ATENDIDO') return false;
    
    // Admin has access to all non-ATENDIDO
    if (userRole === 'ADMINISTRADOR') return true;
    
    if (userRole === 'REGISTRADOR') {
      const allowed = ['EN PROCESO', 'OBSERVADO', 'RECHAZADO'];
      return allowed.includes(record['estado']);
    }
    
    if (userRole === 'IMPRESOR') {
      const blocked = ['VERIFICADO', 'ENTREGADO', 'ATENDIDO', 'ANULADO'];
      return !blocked.includes(record['estado']);
    }

    if (userRole === 'SUPERVISOR') {
      const blocked = ['ENTREGADO', 'ATENDIDO'];
      return !blocked.includes(record['estado']);
    }

    if (userRole === 'ENTREGADOR') {
      const allowed = ['VERIFICADO', 'ENTREGADO', 'OBSERVADO'];
      return allowed.includes(record['estado']);
    }

    return false;
  }

  canDelete(record: any): boolean {
    if (!record) return false;
    const userRole = this.userPerfil;

    // OTI can delete anything
    if (userRole === 'OTI') return true;

    // Block everyone else from ATENDIDO/ENTREGADO (Deletion is dangerous)
    if (['ATENDIDO', 'ENTREGADO'].includes(record['estado'])) return false;

    // Admin can delete if not ATENDIDO/ENTREGADO
    if (userRole === 'ADMINISTRADOR') return true;

    // Registrador can only delete early stages
    if (userRole === 'REGISTRADOR') {
      const allowed = ['EN PROCESO', 'OBSERVADO', 'RECHAZADO'];
      return allowed.includes(record['estado']);
    }

    return false;
  }

  openModal(record?: RecordModel) {
    const isReadOnly = record ? !this.canEdit(record) : false;
    
    const ref = this.dialog.open(ExpedienteFormModal, {
      width: '90vw',
      maxWidth: '920px',
      disableClose: true,
      data: record ?? null
    });
    
    if (isReadOnly) {
      ref.componentInstance.isReadOnly.set(true);
    }
    ref.afterClosed().subscribe(saved => { 
      if (saved) {
        this.loadData(); 
        if (this.userPerfil === 'IMPRESOR' || this.userPerfil === 'ADMINISTRADOR' || this.userPerfil === 'OTI') this.loadAtenciones();
      }
    });
  }

  verSeguimiento(record: RecordModel) {
    this.dialog.open(ExpedienteTrackerComponent, {
      width: '90vw',
      maxWidth: '600px',
      data: { expedienteId: record.id },
    }).componentInstance.expedienteId = record.id; 
    // Since I'm using @Input, I set it on the instance or pass it via data if I refactor the component to use MAT_DIALOG_DATA
  }

  async deleteExpediente(record: any) {
    if (!this.canDelete(record)) {
      this.snackBar.open('No tiene permisos para eliminar este registro en su estado actual.', 'Entendido', { duration: 3000 });
      return;
    }
    if (!confirm('¿Eliminar este expediente? Esta acción no se puede deshacer.')) return;
    this.isLoading.set(true);
    try {
      await this.pbService.pb.collection('expedientes').delete(record.id);
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
      if (this.userPerfil === 'IMPRESOR' || this.userPerfil === 'OTI') await this.loadAtenciones();
    } catch (e: any) {
      this.snackBar.open('Error: ' + e.message, 'Cerrar', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async marcarComoVerificado(record: RecordModel) {
    try {
      this.isLoading.set(true);
      await this.expedienteService.updateExpediente(record.id, { estado: 'VERIFICADO' }, 'MARCADO_RAPIDO_VERIFICADO');
      this.snackBar.open('Expediente marcado como VERIFICADO', 'Cerrar', { duration: 2000 });
      await this.loadData();
      if (['SUPERVISOR', 'OTI', 'ADMINISTRADOR'].includes(this.userPerfil)) await this.loadAtenciones();
    } catch (e: any) {
      this.snackBar.open('Error: ' + e.message, 'Cerrar', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async marcarComoEntregado(record: RecordModel) {
    try {
      this.isLoading.set(true);
      await this.expedienteService.updateExpediente(record.id, { estado: 'ENTREGADO' }, 'MARCADO_RAPIDO_ENTREGA');
      this.snackBar.open('Expediente marcado como ENTREGADO', 'Cerrar', { duration: 2000 });
      await this.loadData();
      if (['ENTREGADOR', 'OTI', 'ADMINISTRADOR'].includes(this.userPerfil)) await this.loadAtenciones();
    } catch (e: any) {
      this.snackBar.open('Error: ' + e.message, 'Cerrar', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async revertirAccion(element: any) {
    const isImpreso = element.expand?.expediente_id?.estado === 'IMPRESO';
    const isVerificado = element.expand?.expediente_id?.estado === 'VERIFICADO';
    const isEntregado = element.expand?.expediente_id?.estado === 'ENTREGADO';
    const isAtendido = element.expand?.expediente_id?.estado === 'ATENDIDO';
    
    if (isAtendido && this.userPerfil !== 'OTI' && this.userPerfil !== 'ADMINISTRADOR') {
      this.snackBar.open('Solo el personal de OTI o Administrador puede revertir un expediente ATENDIDO.', 'Cerrar', { duration: 4000 });
      return;
    }

    if (isImpreso) {
        if (!confirm('¿Desea revertir el estado de este expediente devolviéndolo a "EN PROCESO"?')) return;
    } else if (isVerificado) {
        if (!confirm('¿Desea revertir la verificación devolviéndolo a "IMPRESO"?')) return;
    } else if (isEntregado) {
        if (!confirm('¿Desea revertir la entrega devolviéndolo a "VERIFICADO"?')) return;
    } else if (isAtendido) {
        if (!confirm('¿ESTÁ SEGURO DE REVERTIR UN EXPEDIENTE FINALIZADO (ATENDIDO)? Se devolverá a estado ENTREGADO.')) return;
    } else {
        return;
    }

    const expId = element.expand?.expediente_id?.id;
    if (!expId) return;

    try {
      this.isLoading.set(true);
      if (isImpreso) {
         await this.expedienteService.updateExpediente(expId, { estado: 'EN PROCESO' }, 'REVERTIR_IMPRESION');
         this.snackBar.open('Impresión revertida a EN PROCESO', 'Cerrar', { duration: 2000 });
      } else if (isVerificado) {
         await this.expedienteService.updateExpediente(expId, { estado: 'IMPRESO' }, 'REVERTIR_VERIFICACION');
         this.snackBar.open('Verificación revertida a IMPRESO', 'Cerrar', { duration: 2000 });
      } else if (isEntregado) {
         await this.expedienteService.updateExpediente(expId, { estado: 'VERIFICADO' }, 'REVERTIR_ENTREGA');
         this.snackBar.open('Entrega revertida a VERIFICADO', 'Cerrar', { duration: 2000 });
      } else if (isAtendido) {
        await this.expedienteService.updateExpediente(expId, { estado: 'ENTREGADO' }, 'REVERTIR_ATENCION_OTI');
        this.snackBar.open('Atención revertida por OTI a ENTREGADO', 'Cerrar', { duration: 2000 });
      }
      await this.loadData();
      if (['IMPRESOR', 'SUPERVISOR', 'ENTREGADOR', 'ADMINISTRADOR', 'OTI'].includes(this.userPerfil)) await this.loadAtenciones();
    } catch (e: any) {
      this.snackBar.open('Error al revertir: ' + e.message, 'Cerrar', { duration: 4000 });
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
    if (this.userPerfil === 'IMPRESOR' || this.userPerfil === 'OTI') await this.loadAtenciones();
  }

  async marcarComoVerificadoMasivo() {
    console.log('[BULK] VERIFICADO DETECTADO');
    const selected = this.selection.selected;
    if (selected.length === 0) return;
    
    this.snackBar.open(`Verificando ${selected.length} expedientes...`, 'Ok', { duration: 2000 });

    this.isLoading.set(true);
    let successCount = 0;
    for (const item of selected) {
      if (item['estado'] === 'VERIFICADO') continue;
      try {
        await this.expedienteService.updateExpediente(item.id, { estado: 'VERIFICADO' }, 'PROCESO_MASIVO_VERIFICADOR');
        successCount++;
      } catch (e) {
        console.error('[BULK] Error al verificar masivo:', item.id, e);
      }
    }
    this.snackBar.open(`${successCount} expedientes verificados exitosamente.`, 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
    await this.loadData();
    if (['SUPERVISOR', 'OTI'].includes(this.userPerfil)) await this.loadAtenciones();
    this.isLoading.set(false);
  }

  async marcarComoEntregadoMasivo() {
    console.log('[BULK] ENTREGA DETECTADA');
    const selected = this.selection.selected;
    if (selected.length === 0) return;
    
    this.snackBar.open(`Entregando ${selected.length} expedientes...`, 'Ok', { duration: 2000 });

    this.isLoading.set(true);
    let successCount = 0;
    for (const item of selected) {
      if (item['estado'] === 'ENTREGADO') continue;
      try {
        await this.expedienteService.updateExpediente(item.id, { estado: 'ENTREGADO' }, 'PROCESO_MASIVO_ENTREGA');
        successCount++;
      } catch (e) {
        console.error('[BULK] Error al entregar masivo:', item.id, e);
      }
    }
    this.snackBar.open(`${successCount} expedientes entregados exitosamente.`, 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
    await this.loadData();
    if (['ENTREGADOR', 'OTI'].includes(this.userPerfil)) await this.loadAtenciones();
    this.isLoading.set(false);
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
      const dataToExport = this.dataSource.data;

      if (dataToExport.length === 0) {
        this.snackBar.open('No hay datos para exportar.', 'Cerrar', { duration: 3000 });
        return;
      }
      
      const rows = dataToExport.map((r, i) => ({
        'N°': i + 1,
        'DNI Solicitante': r['dni_solicitante'],
        'Apellidos y Nombres': r['apellidos_nombres'],
        'Trámite': r['tramite'],
        'Categoría': r['categoria'],
        'Estado': r['estado'],
        'OBS': r['observaciones'] || '',
        'Lugar Entrega': r['lugar_entrega']
      }));
      
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mis Expedientes');
      
      const tramiteSuffix = this.selectedTramite() !== 'TODAS' ? `_${this.selectedTramite()}` : '';
      const categoriaSuffix = this.selectedCategoria() !== 'TODAS' ? `_${this.selectedCategoria()}` : '';
      
      XLSX.writeFile(wb, `expedientes${tramiteSuffix}${categoriaSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
      this.snackBar.open('Excel generado con éxito', 'Cerrar', { duration: 2000 });
    } catch (e: any) {
      console.error('[EXPORT-EXCEL] Error:', e);
      this.snackBar.open('Error al generar Excel: ' + e.message, 'Cerrar', { duration: 4000 });
    }
  }

  exportPDF() {
    const userRole = this.authService.currentUser()?.['perfil'];
    if (userRole === 'ADMINISTRADOR') {
      this.exportActivityPDF();
      return;
    }
    
    try {
      const dataToExport = this.dataSource.data;

      if (dataToExport.length === 0) {
        this.snackBar.open('No hay datos para exportar.', 'Cerrar', { duration: 3000 });
        return;
      }
      const doc = new jsPDF({ orientation: 'landscape' });
      const user = this.authService.currentUser();
      const date = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const title = 'DRTC PUNO - Mis Expedientes';
      doc.setFontSize(14);
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      
      let filterText = `Filtros: Trámite: ${this.selectedTramite()} | Categoría: ${this.selectedCategoria()}`;
      doc.text(filterText, 14, 21);
      doc.text(`Operador: ${user?.['nombre'] || 'N/A'} | Fecha: ${date}`, 14, 27);

      const head = [['N°', 'DNI Solic.', 'Apellidos y Nombres', 'Trámite', 'Categoría', 'Lugar', 'Estado', 'OBS']];
      const body = dataToExport.map((r, i) => [
        i + 1,
        r['dni_solicitante'],
        r['apellidos_nombres'],
        r['tramite'],
        r['categoria'],
        r['lugar_entrega'],
        r['estado'],
        r['observaciones'] || ''
      ]);


      autoTable(doc, {
        startY: 32,
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

  exportActivityPDF() {
    try {
      const dataToExport = this.atencionesDataSource.data;

      if (dataToExport.length === 0) {
        this.snackBar.open('No hay registros de actividad para exportar.', 'Cerrar', { duration: 3000 });
        return;
      }
      
      const doc = new jsPDF({ orientation: 'landscape' });
      const user = this.authService.currentUser();
      const dateStr = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
      
      doc.setFontSize(14);
      doc.text('DRTC PUNO - Reporte de Actividad del Operador', 14, 15);
      doc.setFontSize(10);
      doc.text(`Operador: ${user?.['nombre'] || 'N/A'} | Perfil: ${user?.['perfil'] || 'N/A'}`, 14, 22);
      doc.text(`Fecha del Reporte: ${dateStr}`, 14, 28);

      const head = [['N°', 'Fecha/Hora', 'DNI Solic.', 'Persona (Expediente)', 'Trámite', 'Sede/Lugar', 'Estado Actual']];
      const body = dataToExport.map((r, i) => [
        i + 1,
        new Date(r.fecha || r.created).toLocaleString('es-PE'),
        r.expediente_dni,
        r.expand?.expediente_id?.apellidos_nombres || '--',
        r.expand?.expediente_id?.tramite || '--',
        r.expand?.expediente_id?.lugar_entrega || 'N/A',
        r.expand?.expediente_id?.estado || '--'
      ]);

      autoTable(doc, {
        startY: 35,
        head,
        body,
        headStyles: { fillColor: [41, 128, 185] }, // Blue for activity
        styles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [235, 245, 251] }
      });

      doc.save(`actividad_${user?.['nombre']?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      this.snackBar.open('Reporte de actividad generado', 'Cerrar', { duration: 2000 });
    } catch (e: any) {
      console.error('[EXPORT-ACTIVITY-PDF] Error:', e);
      this.snackBar.open('Error al generar PDF: ' + e.message, 'Cerrar', { duration: 4000 });
    }
  }

  get totalRegistros() { return this.dataSource.data.length; }
}
