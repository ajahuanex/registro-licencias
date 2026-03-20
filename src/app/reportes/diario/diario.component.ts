import { Component, inject, OnInit, signal, ViewChild, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ExpedienteService } from '../../core/services/expediente.service';
import { RecordModel } from 'pocketbase';
import { SelectionModel } from '@angular/cdk/collections';
import { AuthService } from '../../core/services/auth.service';

import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ExpedienteFormModal } from '../../mis-expedientes/mis-expedientes';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-diario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  providers: [
    DatePipe,
    { provide: MAT_DATE_LOCALE, useValue: 'es-PE' }
  ],
  templateUrl: './diario.component.html',
  styleUrl: './diario.component.scss'
})
export class DiarioComponent implements OnInit {
  private expedienteService = inject(ExpedienteService);
  private authService = inject(AuthService);
  private datePipe = inject(DatePipe);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  records = signal<RecordModel[]>([]);
  isLoading = signal<boolean>(true);
  currentDate = new Date();
  
  searchTerm = signal('');
  filteredRecords = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.records();
    return this.records().filter(r => 
      (r['dni_solicitante'] || '').includes(term) ||
      (r['apellidos_nombres']?.toLowerCase() || '').includes(term) ||
      (r['tramite']?.toLowerCase() || '').includes(term) ||
      (r['estado']?.toLowerCase() || '').includes(term) ||
      (r['categoria']?.toLowerCase() || '').includes(term) ||
      (r['lugar_entrega']?.toLowerCase() || '').includes(term) ||
      (r['observaciones']?.toLowerCase() || '').includes(term) ||
      (r.expand?.['operador']?.nombre?.toLowerCase() || '').includes(term)
    );
  });

  // ── Column configuration ──────────────────────────────────────
  readonly STORAGE_KEY = 'diario_columns_v1';

  allColumns: ColumnDef[] = [
    { key: 'select',          label: '☑', visible: true },
    { key: 'dni_solicitante', label: 'DNI Solicitante', visible: true },
    { key: 'apellidos_nombres', label: 'Solicitante', visible: true },
    { key: 'tramite',         label: 'Trámite', visible: true },
    { key: 'estado',          label: 'Estado', visible: true },
    { key: 'categoria',       label: 'Categoría', visible: true },
    { key: 'lugar',           label: 'Lugar Entrega', visible: true },
    { key: 'observaciones',   label: 'Observaciones', visible: true }
  ];

  // Non-configurable columns (select always first)
  readonly FIXED_COLS = ['select'];

  // ── Row selection ─────────────────────────────────────────────
  selection = new SelectionModel<RecordModel>(true, []);

  get displayedColumns(): string[] {
    return this.allColumns.filter(c => c.visible).map(c => c.key);
  }

  get configurableColumns(): ColumnDef[] {
    return this.allColumns.filter(c => !this.FIXED_COLS.includes(c.key));
  }

  get dataToExport(): RecordModel[] {
    return this.selection.hasValue() ? this.selection.selected : this.filteredRecords();
  }

  get exportLabel(): string {
    if (this.selection.hasValue()) {
      return `Exportar selección (${this.selection.selected.length})`;
    }
    return 'Exportar todos';
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.filteredRecords().length;
    return numSelected === numRows;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.filteredRecords());
  }

  toggleColumn(col: ColumnDef) {
    // Don't allow hiding the last visible non-select column
    const visible = this.allColumns.filter(c => c.visible && !this.FIXED_COLS.includes(c.key));
    if (col.visible && visible.length === 1) {
      this.snackBar.open('Debes tener al menos una columna visible', 'OK', { duration: 2500 });
      return;
    }
    col.visible = !col.visible;
    this.saveColumnConfig();
  }

  saveColumnConfig() {
    const config = this.allColumns.map(c => ({ key: c.key, visible: c.visible }));
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }

  loadColumnConfig() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const config: { key: string; visible: boolean }[] = JSON.parse(saved);
        config.forEach(saved => {
          const col = this.allColumns.find(c => c.key === saved.key);
          if (col) col.visible = saved.visible;
        });
      }
    } catch {}
  }

  resetColumns() {
    this.allColumns.forEach(c => c.visible = true);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // ── Data ──────────────────────────────────────────────────────
  async ngOnInit() {
    const user = this.authService.currentUser();
    if (user && ['SUPERVISOR', 'ADMINISTRADOR', 'OTI'].includes(user['perfil'])) {
      this.allColumns.splice(1, 0, { key: 'operador_nombre', label: 'Operador', visible: true });
      this.allColumns.push({ key: 'acciones', label: 'Acciones', visible: true });
    }

    this.loadColumnConfig();
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    this.selection.clear();
    try {
      const dateString = this.currentDate.toISOString().split('T')[0];
      const data = await this.expedienteService.getDailyConsolidated(dateString);
      this.records.set(data);
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  editRecord(record: RecordModel) {
    const ref = this.dialog.open(ExpedienteFormModal, {
      width: '90vw',
      maxWidth: '920px',
      disableClose: true,
      data: record
    });
    ref.afterClosed().subscribe(saved => { 
      if (saved) this.loadData(); 
    });
  }

  // ── Export ────────────────────────────────────────────────────
  exportToExcel() {
    const user = this.authService.currentUser();
    const isSup = user && ['SUPERVISOR', 'ADMINISTRADOR', 'OTI'].includes(user['perfil']);

    const rows = this.dataToExport.map(r => {
      const row: any = { 'DNI Solicitante': r['dni_solicitante'] || 'N/A' };
      if (isSup) row['Operador'] = r.expand?.['operador']?.nombre || 'Desconocido';
      
      row['Apellidos y Nombres'] = r['apellidos_nombres'];
      row['Trámite'] = r['tramite'];
      row['Estado'] = r['estado'] || 'EN PROCESO';
      row['Categoría'] = r['categoria'];
      row['Lugar de Entrega'] = r['lugar_entrega'];
      row['Observaciones'] = r['observaciones'] || '';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Diario');
    XLSX.writeFile(wb, `Reporte_${this.datePipe.transform(this.currentDate, 'yyyyMMdd')}.xlsx`);
  }

  exportToPDF() {
    const user = this.authService.currentUser();
    const isSup = user && ['SUPERVISOR', 'ADMINISTRADOR', 'OTI'].includes(user['perfil']);

    const doc = new jsPDF({ orientation: 'landscape' });
    const date = this.datePipe.transform(this.currentDate, 'dd/MM/yyyy');
    const total = this.dataToExport.length;
    doc.setFontSize(14);
    doc.text(`DRTC PUNO - Reporte Consolidado Diario - ${date}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Total de expedientes: ${total}`, 14, 22);

    const head = isSup
      ? [['DNI Solic.', 'Operador', 'Solicitante', 'Trámite', 'Estado', 'Categ.', 'Lugar', 'Observaciones']]
      : [['DNI Solic.', 'Solicitante', 'Trámite', 'Estado', 'Categ.', 'Lugar', 'Observaciones']];

    const body = this.dataToExport.map(r => {
      const row = [r['dni_solicitante'] || 'N/A'];
      if (isSup) row.push(r.expand?.['operador']?.nombre || 'Desconocido');
      row.push(r['apellidos_nombres'], r['tramite'], r['estado'] || 'EN PROCESO', r['categoria'], r['lugar_entrega'], r['observaciones'] || '');
      return row;
    });

    autoTable(doc, {
      startY: 28,
      head: head,
      body: body,
      headStyles: { fillColor: [10, 61, 98] },
      styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [244, 247, 246] }
    });

    doc.save(`Reporte_${this.datePipe.transform(this.currentDate, 'yyyyMMdd')}.pdf`);
  }

  printReport() { window.print(); }
}
