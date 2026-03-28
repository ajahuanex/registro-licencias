import { Component, inject, OnInit, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpedienteService } from '../core/services/expediente.service';
import { AuthService } from '../core/services/auth.service';
import { ReporteService } from '../core/services/reporte.service';
import { RecordModel } from 'pocketbase';
import { ESTADOS_SISTEMA } from '../core/constants/app.constants';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { Chart, registerables } from 'chart.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(...registerables);

interface Stats {
  total: number;
  porTramite: Record<string, number>;
  porCategoria: Record<string, number>;
  porSede: Record<string, number>;
  porEstado: Record<string, number>;
  porOperador: Record<string, number>;
  porSemana: Record<string, number>;
}

@Component({
  selector: 'app-reporte-mensual',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatSnackBarModule,
    MatTooltipModule, MatMenuModule, MatDividerModule
  ],
  providers: [DatePipe],
  template: `
<div class="page-wrapper fade-in">

  <!-- Header -->
  <div class="page-header">
    <div>
      <h1><mat-icon>bar_chart</mat-icon> Reporte Mensual de Expedientes</h1>
      <p>Análisis consolidado de trámites de licencias de conducir por período</p>
    </div>
    <div class="header-actions">
      <!-- Period selector -->
      <mat-form-field appearance="outline" subscriptSizing="dynamic" style="width:130px">
        <mat-label>Mes</mat-label>
        <mat-select [(ngModel)]="selectedMonth" (ngModelChange)="loadData()">
          @for(m of meses; track m.value) {
            <mat-option [value]="m.value">{{m.label}}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" style="width:100px">
        <mat-label>Año</mat-label>
        <mat-select [(ngModel)]="selectedYear" (ngModelChange)="loadData()">
          @for(y of years; track y) { <mat-option [value]="y">{{y}}</mat-option> }
        </mat-select>
      </mat-form-field>
      <button mat-icon-button matTooltip="Actualizar" (click)="loadData()">
        <mat-icon [class.rolling]="isLoading()">sync</mat-icon>
      </button>
      <button mat-raised-button color="primary" [matMenuTriggerFor]="exportMenu" [disabled]="records().length===0">
        <mat-icon>file_download</mat-icon> Exportar
      </button>
      <mat-menu #exportMenu="matMenu">
        <button mat-menu-item (click)="exportExcel()"><mat-icon>table_view</mat-icon> Excel (.xlsx)</button>
        <button mat-menu-item (click)="exportPDF()"><mat-icon>picture_as_pdf</mat-icon> PDF</button>
      </mat-menu>
    </div>
  </div>

  @if (isLoading()) {
    <div class="loading-center"><div class="spinner"></div><span>Cargando datos del período...</span></div>
  } @else if (records().length === 0) {
    <div class="empty-state">
      <mat-icon>inbox</mat-icon>
      <p>No hay expedientes registrados para <strong>{{ mesLabel }} {{ selectedYear }}</strong></p>
    </div>
  } @else {

    <!-- Summary Cards -->
    <div class="cards-grid">
      <mat-card class="stat-card total">
        <mat-icon>folder_open</mat-icon>
        <div class="stat-value">{{ stats().total }}</div>
        <div class="stat-label">Total Expedientes</div>
      </mat-card>
      @for(item of tramiteItems(); track item.key) {
        <mat-card class="stat-card">
          <mat-icon>{{ tramiteIcon(item.key) }}</mat-icon>
          <div class="stat-value">{{ item.count }}</div>
          <div class="stat-label">{{ item.key }}</div>
          <div class="stat-pct">{{ pct(item.count) }}%</div>
        </mat-card>
      }
    </div>

    <!-- Charts Row 1 -->
    <div class="charts-row">
      <mat-card class="chart-card wide">
        <div class="chart-title"><mat-icon>timeline</mat-icon> Expedientes por Semana</div>
        <canvas #chartSemana></canvas>
      </mat-card>
      <mat-card class="chart-card">
        <div class="chart-title"><mat-icon>donut_large</mat-icon> Por Categoría</div>
        <canvas #chartCategoria></canvas>
      </mat-card>
    </div>

    <!-- Charts Row 2 -->
    <div class="charts-row">
      <mat-card class="chart-card">
        <div class="chart-title"><mat-icon>location_on</mat-icon> Por Sede</div>
        <canvas #chartSede></canvas>
      </mat-card>
      <mat-card class="chart-card wide">
        <div class="chart-title"><mat-icon>people</mat-icon> Producción por Operador</div>
        <canvas #chartOperador></canvas>
      </mat-card>
    </div>

    <!-- Summary Table -->
    <mat-card class="table-card">
      <div class="chart-title"><mat-icon>table_chart</mat-icon> Resumen Cruzado: Trámite × Estado</div>
      <div class="table-scroll">
        <table class="summary-table">
          <thead>
            <tr>
              <th>Trámite</th>
              @for(e of estadoKeys; track e) { <th>{{e}}</th> }
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            @for(row of tramiteEstadoMatrix(); track row.tramite) {
              <tr>
                <td><strong>{{row.tramite}}</strong></td>
                @for(e of estadoKeys; track e) { <td>{{ row.estados[e] || 0 }}</td> }
                <td><strong>{{row.total}}</strong></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </mat-card>
  }
</div>
  `,
  styles: [`
    .page-wrapper { padding: 1.5rem; max-width: 1300px; margin: 0 auto; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .page-header h1 { display: flex; align-items: center; gap: 8px; font-size: 1.4rem; margin: 0 0 4px; }
    .page-header p { color: #666; margin: 0; font-size: 0.9rem; }
    .header-actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
    .rolling { animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .fade-in { animation: fadeIn 0.4s ease-out; }

    .loading-center { display: flex; flex-direction: column; align-items: center; padding: 4rem; gap: 1rem; color: #666; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top-color: #1a4f8f; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .empty-state { text-align: center; padding: 4rem; color: #999; mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 1rem; } }

    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { padding: 1.25rem; text-align: center; border-radius: 12px !important; }
    .stat-card mat-icon { font-size: 28px; width: 28px; height: 28px; color: #1a4f8f; margin-bottom: 0.5rem; }
    .stat-card.total { background: linear-gradient(135deg, #0a3d62, #1a7fbe); color: white; }
    .stat-card.total mat-icon { color: rgba(255,255,255,0.8); }
    .stat-value { font-size: 2rem; font-weight: 700; line-height: 1; }
    .stat-label { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; opacity: 0.85; margin-top: 4px; }
    .stat-pct { font-size: 0.85rem; color: #1a7fbe; font-weight: 600; margin-top: 2px; }
    .stat-card.total .stat-pct { color: rgba(255,255,255,0.7); }

    .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    .charts-row:nth-child(even) { grid-template-columns: 1fr 2fr; }
    .chart-card { padding: 1.25rem; border-radius: 12px !important; }
    .chart-card.wide { }
    .chart-title { display: flex; align-items: center; gap: 6px; font-weight: 600; color: #0a3d62; margin-bottom: 0.75rem; font-size: 0.95rem; }
    .chart-title mat-icon { font-size: 18px; width: 18px; height: 18px; }
    canvas { max-height: 260px; }

    .table-card { padding: 1.25rem; margin-top: 1rem; border-radius: 12px !important; }
    .table-scroll { overflow-x: auto; }
    .summary-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .summary-table th { background: #0a3d62; color: white; padding: 0.5rem 1rem; text-align: center; font-weight: 600; }
    .summary-table td { padding: 0.5rem 1rem; border-bottom: 1px solid #f0f0f0; text-align: center; }
    .summary-table tr:hover td { background: #f8fafc; }
    .summary-table td:first-child { text-align: left; }
  `]
})
export class ReporteMensualComponent implements OnInit {
  private expedienteService = inject(ExpedienteService);
  private authService = inject(AuthService);
  private reporteService = inject(ReporteService);
  private datePipe = inject(DatePipe);
  private snackBar = inject(MatSnackBar);

  @ViewChild('chartSemana')   chartSemanaRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCategoria') chartCategoriaRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartSede')     chartSedeRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartOperador') chartOperadorRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  records = signal<RecordModel[]>([]);
  isLoading = signal(true);

  meses = [
    { value: 0, label: 'Enero' }, { value: 1, label: 'Febrero' },
    { value: 2, label: 'Marzo' }, { value: 3, label: 'Abril' },
    { value: 4, label: 'Mayo' },  { value: 5, label: 'Junio' },
    { value: 6, label: 'Julio' }, { value: 7, label: 'Agosto' },
    { value: 8, label: 'Septiembre' }, { value: 9, label: 'Octubre' },
    { value: 10, label: 'Noviembre' }, { value: 11, label: 'Diciembre' }
  ];

  today = new Date();
  selectedMonth = this.today.getMonth();
  selectedYear = this.today.getFullYear();
  years = Array.from({ length: 5 }, (_, i) => this.today.getFullYear() - i);

  get mesLabel() { return this.meses[this.selectedMonth]?.label ?? ''; }

  estadoKeys = [...ESTADOS_SISTEMA];

  stats = computed<Stats>(() => {
    const recs = this.records();
    const s: Stats = {
      total: recs.length,
      porTramite:   {},
      porCategoria: {},
      porSede:      {},
      porEstado:    {},
      porOperador:  {},
      porSemana:    { 'Sem 1': 0, 'Sem 2': 0, 'Sem 3': 0, 'Sem 4': 0, 'Sem 5': 0 }
    };
    for (const r of recs) {
      const inc = (obj: Record<string,number>, key: string) => { obj[key] = (obj[key] ?? 0) + 1; };
      inc(s.porTramite,   r['tramite']       || 'Sin Tipo');
      inc(s.porCategoria, r['categoria']     || 'Sin Cat.');
      inc(s.porSede,      r['lugar_entrega'] || 'Sin Sede');
      inc(s.porEstado,    r['estado']        || 'EN PROCESO');
      const nombre = r.expand?.['operador']?.nombre || 'Desconocido';
      inc(s.porOperador, nombre);
      const d = new Date(r['fecha_registro']);
      const day = d.getDate();
      const sem = day <= 7 ? 'Sem 1' : day <= 14 ? 'Sem 2' : day <= 21 ? 'Sem 3' : day <= 28 ? 'Sem 4' : 'Sem 5';
      inc(s.porSemana, sem);
    }
    return s;
  });

  tramiteItems = computed(() =>
    Object.entries(this.stats().porTramite).map(([key, count]) => ({ key, count })).sort((a,b) => b.count - a.count)
  );

  tramiteEstadoMatrix = computed(() => {
    const recs = this.records();
    const map: Record<string, Record<string, number>> = {};
    for (const r of recs) {
      const t = r['tramite'] || 'Sin Tipo';
      const e = r['estado']  || 'EN PROCESO';
      if (!map[t]) map[t] = {};
      map[t][e] = (map[t][e] ?? 0) + 1;
    }
    return Object.entries(map).map(([tramite, estados]) => ({
      tramite,
      estados,
      total: Object.values(estados).reduce((a,b) => a+b, 0)
    })).sort((a,b) => b.total - a.total);
  });

  pct(count: number) { return this.stats().total ? Math.round(count / this.stats().total * 100) : 0; }

  tramiteIcon(t: string): string {
    const map: Record<string, string> = {
      'Obtención': 'add_card', 'Revalidación': 'autorenew',
      'Duplicado': 'content_copy', 'Recategorización': 'upgrade'
    };
    return map[t] ?? 'description';
  }

  async ngOnInit() { await this.loadData(); }

  async loadData() {
    this.isLoading.set(true);
    this.destroyCharts();
    try {
      const year  = this.selectedYear;
      const month = this.selectedMonth;
      const start = new Date(year, month, 1, 0, 0, 0);
      const end   = new Date(year, month + 1, 0, 23, 59, 59);
      const startStr = `${year}-${String(month+1).padStart(2,'0')}-01 00:00:00.000Z`;
      const lastDay  = new Date(year, month + 1, 0).getDate();
      const endStr   = `${year}-${String(month+1).padStart(2,'0')}-${lastDay} 23:59:59.999Z`;
      const filter   = `fecha_registro >= "${startStr}" && fecha_registro <= "${endStr}"`;
      const data = await this.expedienteService['pbService'].pb.collection('expedientes').getFullList({
        filter, sort: 'fecha_registro', expand: 'operador'
      });
      this.records.set(data);
      setTimeout(() => this.renderCharts(), 100);
    } catch(e: any) {
      this.snackBar.open('Error cargando datos: ' + e.message, 'Cerrar', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  private destroyCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  private renderCharts() {
    const s = this.stats();
    const PALETTE = ['#0a3d62','#1a7fbe','#2ecc71','#e74c3c','#f39c12','#9b59b6','#1abc9c','#e67e22','#3498db','#e91e63'];

    // Semana
    if (this.chartSemanaRef) {
      const c = new Chart(this.chartSemanaRef.nativeElement, {
        type: 'bar',
        data: {
          labels: Object.keys(s.porSemana),
          datasets: [{ label: 'Expedientes', data: Object.values(s.porSemana),
            backgroundColor: '#1a7fbe', borderRadius: 6, borderSkipped: false }]
        },
        options: { responsive: true, plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });
      this.charts.push(c);
    }

    // Categoría
    if (this.chartCategoriaRef) {
      const keys = Object.keys(s.porCategoria);
      const c = new Chart(this.chartCategoriaRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: keys,
          datasets: [{ data: keys.map(k => s.porCategoria[k]), backgroundColor: PALETTE }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
      this.charts.push(c);
    }

    // Sede
    if (this.chartSedeRef) {
      const keys = Object.keys(s.porSede);
      const c = new Chart(this.chartSedeRef.nativeElement, {
        type: 'pie',
        data: {
          labels: keys,
          datasets: [{ data: keys.map(k => s.porSede[k]), backgroundColor: ['#0a3d62','#1a7fbe','#2ecc71'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
      this.charts.push(c);
    }

    // Operador
    if (this.chartOperadorRef) {
      const entries = Object.entries(s.porOperador).sort((a,b) => b[1]-a[1]).slice(0, 10);
      const c = new Chart(this.chartOperadorRef.nativeElement, {
        type: 'bar',
        data: {
          labels: entries.map(e => e[0]),
          datasets: [{ label: 'Expedientes', data: entries.map(e => e[1]),
            backgroundColor: PALETTE, borderRadius: 6, borderSkipped: false }]
        },
        options: { indexAxis: 'y', responsive: true,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });
      this.charts.push(c);
    }
  }

  exportExcel() {
    const rows = this.records().map((r, i) => ({
      'N°': i + 1,
      'Fecha': this.datePipe.transform(r['fecha_registro'], 'dd/MM/yyyy HH:mm') || '',
      'DNI': r['dni_solicitante'],
      'Apellidos y Nombres': r['apellidos_nombres'],
      'Trámite': r['tramite'],
      'Categoría': r['categoria'],
      'Sede': r['lugar_entrega'],
      'Estado': r['estado'],
      'Operador': r.expand?.['operador']?.nombre || '',
      'Observaciones': r['observaciones'] || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${this.mesLabel} ${this.selectedYear}`);
    XLSX.writeFile(wb, `Reporte_Mensual_${this.mesLabel}_${this.selectedYear}.xlsx`);
  }

  async exportPDF() {
    const s = this.stats();
    const doc = new jsPDF({ orientation: 'landscape' });
    const user = this.authService.currentUser();
    const dateStr = this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm') || '';
    const pageW = doc.internal.pageSize.width;

    // Register & get QR
    let qrDataUrl = '';
    try {
      const { id, verifyUrl } = await this.reporteService.registrarReporte({
        generado_por: user!.id,
        tipo_reporte: 'REPORTE_DIARIO',
        fecha_reporte: `${this.selectedYear}-${String(this.selectedMonth + 1).padStart(2,'0')}-01`,
        total_registros: s.total,
        sede: 'Ambas'
      });
      qrDataUrl = await this.reporteService.generarQR(verifyUrl);
    } catch {}

    // Header
    doc.setFontSize(14);
    doc.text(`DRTC PUNO — Reporte Mensual: ${this.mesLabel} ${this.selectedYear}`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Generado por: ${user?.['nombre'] || 'N/A'} | ${dateStr} | Total: ${s.total}`, 14, 22);
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', pageW - 42, 6, 30, 30);
      doc.setFontSize(6); doc.setTextColor(120);
      doc.text('Verificar\nautenticidad', pageW - 40, 38);
      doc.setTextColor(0);
    }

    // Resumen por trámite
    doc.setFontSize(11); doc.text('Resumen por Tipo de Trámite', 14, 35);
    autoTable(doc, {
      startY: 40,
      head: [['Trámite', 'Cantidad', '% del Total']],
      body: Object.entries(s.porTramite).map(([t, c]) => [t, c, `${this.pct(c)}%`]),
      headStyles: { fillColor: [10, 61, 98] }, styles: { fontSize: 9 }
    });

    const y1 = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11); doc.text('Resumen por Categoría', 14, y1);
    autoTable(doc, {
      startY: y1 + 5,
      head: [['Categoría', 'Cantidad', '% del Total']],
      body: Object.entries(s.porCategoria).sort((a,b)=>b[1]-a[1]).map(([k, c]) => [k, c, `${this.pct(c)}%`]),
      headStyles: { fillColor: [10, 61, 98] }, styles: { fontSize: 9 }
    });

    // Second page: detail
    doc.addPage();
    doc.setFontSize(11); doc.text('Detalle de Expedientes', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Fecha','DNI','Solicitante','Trámite','Categoría','Sede','Estado','Operador']],
      body: this.records().map(r => [
        this.datePipe.transform(r['fecha_registro'], 'dd/MM/yy HH:mm') || '',
        r['dni_solicitante'], r['apellidos_nombres'],
        r['tramite'], r['categoria'], r['lugar_entrega'],
        r['estado'] || 'EN PROCESO',
        r.expand?.['operador']?.nombre || ''
      ]),
      headStyles: { fillColor: [10, 61, 98] }, styles: { fontSize: 7 },
      alternateRowStyles: { fillColor: [244, 247, 246] }
    });

    doc.save(`Reporte_Mensual_${this.mesLabel}_${this.selectedYear}.pdf`);
    this.snackBar.open('PDF generado y registrado', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
  }
}
