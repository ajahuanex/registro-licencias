import { Component, inject, OnInit, signal, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExpedienteService } from '../core/services/expediente.service';
import { AuthService } from '../core/services/auth.service';
import { ReporteService } from '../core/services/reporte.service';
import { RecordModel } from 'pocketbase';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(...registerables);

const ESTADOS_SISTEMA = ['EN PROCESO', 'OBSERVADO', 'IMPRESO', 'ATENDIDO'];

interface StatsData {
  total: number;
  enProceso: number;
  impresos: number;
  atendidos: number;
  observados: number;
  obtencion: number;
  revalidaciones: number;
  recategorizacion: number;
  duplicados: number;
  puno: number;
  juliaca: number;
  
  // Detailed breakdowns for charts/matrix
  porCategoria: Record<string, number>;
  porSede: Record<string, number>;
  porOperador: Record<string, number>;
  porEstado: Record<string, number>;
  matrix: any[]; // Trámite x Estado
}

interface DashboardStats {
  daily: StatsData;
  monthly: StatsData;
  annual: StatsData;
  myAnnualProgress: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTabsModule, MatTooltipModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private expedienteService = inject(ExpedienteService);
  public authService = inject(AuthService);
  private reporteService = inject(ReporteService);
  
  private emptyStats(): StatsData {
    return {
      total: 0, enProceso: 0, impresos: 0, atendidos: 0, observados: 0,
      obtencion: 0, revalidaciones: 0, recategorizacion: 0, duplicados: 0,
      puno: 0, juliaca: 0,
      porCategoria: {}, porSede: {}, porOperador: {}, porEstado: {},
      matrix: []
    };
  }

  stats = signal<DashboardStats>({
    daily: this.emptyStats(),
    monthly: this.emptyStats(),
    annual: this.emptyStats(),
    myAnnualProgress: 0
  });

  estadoKeys = [...ESTADOS_SISTEMA];

  @ViewChild('statesChart') statesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tramitesChart') tramitesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sedesChart') sedesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('operadorChart') operadorChartRef!: ElementRef<HTMLCanvasElement>;

  activeTab = signal<'daily' | 'monthly' | 'annual'>('daily');

  private charts: { [key: string]: Chart | null } = {
    states: null,
    tramites: null,
    sedes: null,
    operador: null
  };

  isLoading = signal<boolean>(true);
  currentDate = new Date();

  constructor() {
    effect(() => {
      const currentStats = this.stats();
      setTimeout(() => this.updateAllCharts(), 100);
    });
  }

  async ngOnInit() {
    await this.loadAllStats();
  }

  async loadAllStats() {
    this.isLoading.set(true);
    const user = this.authService.currentUser();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    
    const isAdmin = user?.['perfil'] === 'ADMINISTRADOR' || user?.['perfil'] === 'OTI';
    
    let dailyPromise, monthlyPromise, annualPromise;
    
    if (isAdmin) {
      dailyPromise = this.expedienteService.getByDateRange(todayStart, todayEnd);
      monthlyPromise = this.expedienteService.getByDateRange(monthStart, todayEnd);
      annualPromise = this.expedienteService.getByDateRange(yearStart, todayEnd);
    } else {
      // Personal Dashboard for Registrador, Impresor, Supervisor, Entregador
      dailyPromise = this.expedienteService.getByOperatorInterventionsRange(user!.id, todayStart, todayEnd);
      monthlyPromise = this.expedienteService.getByOperatorInterventionsRange(user!.id, monthStart, todayEnd);
      annualPromise = this.expedienteService.getByOperatorInterventionsRange(user!.id, yearStart, todayEnd);
    }

    const [daily, monthly, annual, myProgress] = await Promise.all([
      dailyPromise,
      monthlyPromise,
      annualPromise,
      this.expedienteService.getMyActionsCount(user!.id, yearStart, todayEnd)
    ]);

    this.stats.set({
      daily: this.calculateDetailedStats(daily),
      monthly: this.calculateDetailedStats(monthly),
      annual: this.calculateDetailedStats(annual),
      myAnnualProgress: myProgress
    });
    this.isLoading.set(false);
  }

  private calculateDetailedStats(recs: RecordModel[]): StatsData {
    const s: StatsData = this.emptyStats();
    s.total = recs.length;

    const matrixMap: Record<string, Record<string, number>> = {};

    for (const r of recs) {
      const inc = (obj: Record<string, number>, key: string) => { obj[key] = (obj[key] ?? 0) + 1; };
      
      const estado = r['estado'] || 'EN PROCESO';
      const tramite = r['tramite'] || 'Sin Tipo';
      const categoria = r['categoria'] || 'Sin Cat.';
      const sede = r['lugar_entrega'] || 'Sin Sede';
      const operador = r.expand?.['operador']?.nombre || 'Desconocido';

      inc(s.porEstado, estado);
      inc(s.porCategoria, categoria);
      inc(s.porSede, sede);
      inc(s.porOperador, operador);

      if (estado === 'EN PROCESO') s.enProceso++;
      if (['IMPRESO', 'VERIFICADO', 'ENTREGADO'].includes(estado)) s.impresos++;
      if (estado === 'ATENDIDO') s.atendidos++;
      if (estado === 'OBSERVADO') s.observados++;

      const tNorm = tramite.toUpperCase();
      if (tNorm.includes('OBTENCIÓN')) s.obtencion++;
      if (tNorm.includes('REVALIDACIÓN')) s.revalidaciones++;
      if (tNorm.includes('RECATEGORIZACIÓN')) s.recategorizacion++;
      if (tNorm.includes('DUPLICADO')) s.duplicados++;

      const sNorm = sede.toUpperCase();
      if (sNorm.includes('PUNO')) s.puno++;
      if (sNorm.includes('JULIACA')) s.juliaca++;

      if (!matrixMap[tramite]) matrixMap[tramite] = {};
      matrixMap[tramite][estado] = (matrixMap[tramite][estado] ?? 0) + 1;
    }

    s.matrix = Object.entries(matrixMap).map(([tramite, estados]) => ({
      tramite,
      estados,
      total: Object.values(estados).reduce((a, b) => a + b, 0)
    })).sort((a, b) => b.total - a.total);

    return s;
  }

  pct(count: number, total: number) {
    return total ? Math.round(count / total * 100) : 0;
  }

  // ── Charts ──────────────────────────────────────────────────

  onTabChange(event: any) {
    const index = event.index;
    if (index === 0) this.activeTab.set('daily');
    else if (index === 1) this.activeTab.set('monthly');
    else if (index === 2) this.activeTab.set('annual');
    
    setTimeout(() => this.updateAllCharts(), 50);
  }

  private updateAllCharts() {
    const period = this.activeTab();
    const data = this.stats()[period];
    
    this.renderStatesChart(data);
    this.renderTramitesChart(data);
    this.renderSedesChart(data);
    this.renderOperadorChart(data);
  }

  private renderStatesChart(data: StatsData) {
    if (!this.statesChartRef) return;
    const ctx = this.statesChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.charts['states']) this.charts['states'].destroy();

    // Premium Palette
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#1e3a8a'];
    const CHART_FONT = { family: "'Inter', 'Roboto', sans-serif", size: 11 };

    this.charts['states'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['En Proceso', 'Observado', 'Impreso', 'Atendido'],
        datasets: [{
          data: [data.enProceso, data.observados, data.impresos, data.atendidos],
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { usePointStyle: true, pointStyle: 'circle', padding: 15, font: CHART_FONT } 
          }
        }
      }
    });
  }

  private renderTramitesChart(data: StatsData) {
    if (!this.tramitesChartRef) return;
    const ctx = this.tramitesChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.charts['tramites']) this.charts['tramites'].destroy();
    const CHART_FONT = { family: "'Inter', 'Roboto', sans-serif", size: 11 };

    this.charts['tramites'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Nuevos/Obt.', 'Reval.', 'Recat.', 'Duplic.'],
        datasets: [{
          label: 'Cantidad',
          data: [data.obtencion, data.revalidaciones, data.recategorizacion, data.duplicados],
          backgroundColor: '#1e3a8a',
          borderRadius: 8,
          barThickness: 30
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: CHART_FONT } },
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1, font: CHART_FONT } }
        }
      }
    });
  }

  private renderSedesChart(data: StatsData) {
    if (!this.sedesChartRef) return;
    const ctx = this.sedesChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.charts['sedes']) this.charts['sedes'].destroy();
    const CHART_FONT = { family: "'Inter', 'Roboto', sans-serif", size: 11 };

    this.charts['sedes'] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Puno', 'Juliaca'],
        datasets: [{
          data: [data.puno, data.juliaca],
          backgroundColor: ['#1e3a8a', '#3b82f6'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { usePointStyle: true, pointStyle: 'circle', padding: 15, font: CHART_FONT } 
          }
        }
      }
    });
  }

  private renderOperadorChart(data: StatsData) {
    if (!this.operadorChartRef) return;
    const ctx = this.operadorChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.charts['operador']) this.charts['operador'].destroy();
    const CHART_FONT = { family: "'Inter', 'Roboto', sans-serif", size: 11 };

    const entries = Object.entries(data.porOperador).sort((a,b) => b[1]-a[1]).slice(0, 8);

    this.charts['operador'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: entries.map(e => e[0]),
        datasets: [{
          label: 'Expedientes',
          data: entries.map(e => e[1]),
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          barThickness: 20
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1, font: CHART_FONT } },
          y: { grid: { display: false }, ticks: { font: CHART_FONT } }
        }
      }
    });
  }

  // ── Reports ──────────────────────────────────────────────────

  async exportToPDF() {
    this.isLoading.set(true);
    try {
      const user = this.authService.currentUser();
      const period = this.activeTab();
      const data = this.stats()[period];
      const doc = new jsPDF({ orientation: 'portrait' });
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-PE');
      const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

      // 1. Register Report & get QR
      let qrDataUrl = '';
      try {
        const snapshot = {
          operador: user?.['nombre'] || 'N/A',
          sede: 'Consolidado',
          fecha_reporte: dateStr,
          tipo: 'DASHBOARD_RESUMEN',
          registros: [{ 
            n: 1, 
            nombre: 'Resumen de Métricas', 
            detalles: JSON.stringify(data)
          }]
        };
        
        const { verifyUrl } = await this.reporteService.registrarReporte({
          generado_por: user!.id,
          tipo_reporte: 'REPORTE_DIARIO', // Generic for now or add a new type
          fecha_reporte: now.toISOString().split('T')[0],
          total_registros: data.total,
          sede: 'Ambas'
        }, snapshot as any);
        qrDataUrl = await this.reporteService.generarQR(verifyUrl);
      } catch (e) { console.warn('QR skip:', e); }

      // 2. Generate PDF Content
      const pageW = doc.internal.pageSize.width;
      
      // Header
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138); // Navy blue
      doc.text('REPORTE EJECUTIVO DE GESTIÓN', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`DRTC PUNO - Sistema de Licencias de Conducir`, 14, 26);
      doc.text(`Generado por: ${user?.['nombre'] || 'SISTEMA'} | ${dateStr} ${timeStr}`, 14, 31);
      
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', pageW - 40, 10, 26, 26);
        doc.setFontSize(7);
        doc.text('Validar Reporte', pageW - 36, 38);
      }

      doc.setDrawColor(200);
      doc.line(14, 42, pageW - 14, 42);

      // Section: Period Info
      doc.setFontSize(12);
      doc.setTextColor(0);
      const periodLabel = period === 'daily' ? 'Diario (Hoy)' : (period === 'monthly' ? 'Mensual' : 'Anual');
      doc.text(`Resumen de Periodo: ${periodLabel}`, 14, 52);

      // Table 1: Primary Metrics
      autoTable(doc, {
        startY: 58,
        head: [['Métrica', 'Valor', 'Porcentaje']],
        body: [
          ['Total Expedientes', data.total.toString(), '100%'],
          ['En Proceso', data.enProceso.toString(), `${this.pct(data.enProceso, data.total)}%`],
          ['Impresos / Listos', data.impresos.toString(), `${this.pct(data.impresos, data.total)}%`],
          ['Atendidos (Finalizados)', data.atendidos.toString(), `${this.pct(data.atendidos, data.total)}%`],
          ['Observados', data.observados.toString(), `${this.pct(data.observados, data.total)}%`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138] },
        styles: { fontSize: 9 }
      });

      // Table 2: By Type
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Trámite', 'Cantidad', 'Distribución']],
        body: [
          ['Obtención de Licencia', data.obtencion.toString(), `${this.pct(data.obtencion, data.total)}%`],
          ['Revalidación', data.revalidaciones.toString(), `${this.pct(data.revalidaciones, data.total)}%`],
          ['Recategorización', data.recategorizacion.toString(), `${this.pct(data.recategorizacion, data.total)}%`],
          ['Duplicados', data.duplicados.toString(), `${this.pct(data.duplicados, data.total)}%`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 }
      });

      // Matrix Table
      doc.addPage();
      doc.setFontSize(13);
      doc.text('Matriz Cruzada: Trámites por Estado', 14, 20);

      const matrixHead = [['Trámite', ...this.estadoKeys, 'Total']];
      const matrixBody = data.matrix.map(row => [
        row.tramite,
        ...this.estadoKeys.map(k => row.estados[k] || 0),
        row.total
      ]);

      autoTable(doc, {
        startY: 28,
        head: matrixHead,
        body: matrixBody,
        theme: 'grid',
        styles: { fontSize: 7, halign: 'center' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        headStyles: { fillColor: [30, 41, 59] }
      });

      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('Documento generado automáticamente por la plataforma de gestión DRTC PUNO.', 14, (doc as any).lastAutoTable.finalY + 15);

      const filename = `Dashboard_${period}_${now.toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
    } catch (error: any) {
      console.error('Export error:', error);
      alert('Error al generar PDF: ' + error.message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
