import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ExpedienteService } from '../../core/services/expediente.service';
import { RecordModel } from 'pocketbase';
import { SelectionModel } from '@angular/cdk/collections';

import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  providers: [DatePipe],
  templateUrl: './diario.component.html',
  styleUrl: './diario.component.scss'
})
export class DiarioComponent implements OnInit {
  private expedienteService = inject(ExpedienteService);
  private datePipe = inject(DatePipe);
  private snackBar = inject(MatSnackBar);

  records = signal<RecordModel[]>([]);
  isLoading = signal<boolean>(true);
  currentDate = new Date();

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
    return this.selection.hasValue() ? this.selection.selected : this.records();
  }

  get exportLabel(): string {
    if (this.selection.hasValue()) {
      return `Exportar selección (${this.selection.selected.length})`;
    }
    return 'Exportar todos';
  }

  isAllSelected(): boolean {
    return this.selection.selected.length === this.records().length;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.records());
    }
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

  // ── Export ────────────────────────────────────────────────────
  exportToExcel() {
    const rows = this.dataToExport.map(r => ({
      'DNI Solicitante': r['dni_solicitante'] || 'N/A',
      'Apellidos y Nombres': r['apellidos_nombres'],
      Trámite: r['tramite'],
      Estado: r['estado'] || 'EN PROCESO',
      Categoría: r['categoria'],
      'Lugar de Entrega': r['lugar_entrega'],
      Observaciones: r['observaciones'] || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Diario');
    XLSX.writeFile(wb, `Reporte_${this.datePipe.transform(this.currentDate, 'yyyyMMdd')}.xlsx`);
  }

  exportToPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const date = this.datePipe.transform(this.currentDate, 'dd/MM/yyyy');
    const total = this.dataToExport.length;
    doc.setFontSize(14);
    doc.text(`DRTC PUNO - Reporte Consolidado Diario - ${date}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Total de expedientes: ${total}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['DNI Solic.', 'Solicitante', 'Trámite', 'Estado', 'Categ.', 'Lugar', 'Observaciones']],
      body: this.dataToExport.map(r => [
        r['dni_solicitante'] || 'N/A',
        r['apellidos_nombres'],
        r['tramite'],
        r['estado'] || 'EN PROCESO',
        r['categoria'],
        r['lugar_entrega'],
        r['observaciones'] || ''
      ]),
      headStyles: { fillColor: [10, 61, 98] },
      styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [244, 247, 246] }
    });

    doc.save(`Reporte_${this.datePipe.transform(this.currentDate, 'yyyyMMdd')}.pdf`);
  }

  printReport() { window.print(); }
}
