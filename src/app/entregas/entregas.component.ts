import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpedienteService } from '../core/services/expediente.service';
import { AuthService } from '../core/services/auth.service';
import { ReporteService } from '../core/services/reporte.service';
import { RecordModel } from 'pocketbase';

import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-entregas',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatCardModule,
    MatButtonModule, MatIconModule,    MatTooltipModule,
    MatSelectModule,
    MatSnackBarModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatPaginatorModule
  ],
  providers: [DatePipe],
  templateUrl: './entregas.component.html',
  styleUrl: './entregas.component.scss'
})
export class EntregasComponent implements OnInit {
  private expedienteService = inject(ExpedienteService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private reporteService = inject(ReporteService);

  lugares = ['Puno', 'Juliaca'];
  selectedLugar = signal('Puno');
  records = signal<RecordModel[]>([]);
  deliveredRecords = signal<RecordModel[]>([]);
  isLoading = signal(true);

  // Filtros y Paginación para Entregas
  selectedRange = signal<'hoy' | 'ayer' | 'semana' | 'mes' | 'historico'>('hoy');
  deliveredPage = signal(1); // PocketBase uses 1-based indexing
  deliveredPageSize = signal(10);
  deliveredTotalItems = signal(0);
  
  currentUserSede = computed(() => {
    const user = this.authService.currentUser();
    if (user && user['sede']) {
      const rawSede = String(user['sede']).trim().toLowerCase();
      return rawSede === 'juliaca' ? 'Juliaca' : 'Puno';
    }
    return '';
  });
  currentDate = new Date();

  searchTerm = signal('');
  filteredRecords = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.records();
    return this.records().filter(r => 
      (r['dni_solicitante'] || '').includes(term) ||
      (r['apellidos_nombres']?.toLowerCase() || '').includes(term) ||
      (r['tramite']?.toLowerCase() || '').includes(term) ||
      (r['categoria']?.toLowerCase() || '').includes(term)
    );
  });

  filteredDeliveredRecords = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.deliveredRecords();
    return this.deliveredRecords().filter(r => 
      (r['dni_solicitante'] || '').includes(term) ||
      (r['apellidos_nombres']?.toLowerCase() || '').includes(term) ||
      (r['tramite']?.toLowerCase() || '').includes(term) ||
      (r['categoria']?.toLowerCase() || '').includes(term)
    );
  });

  displayedColumns: string[] = ['dni_solicitante', 'apellidos_nombres', 'tramite', 'categoria', 'fecha', 'acciones'];
  deliveredColumns: string[] = ['num', 'dni_solicitante', 'apellidos_nombres', 'tramite', 'categoria', 'fecha_entrega'];

  private datePipe = inject(DatePipe);

  async ngOnInit() {
    const sede = this.currentUserSede();
    if (sede) {
      this.selectedLugar.set(sede);
    }
    await this.loadData();
  }

  canDeliver() {
    // Admins OTI and Admin can always deliver, or Entregador assigned to this Sede
    const user = this.authService.currentUser();
    if (!user) return false;
    if (user['perfil'] === 'OTI' || user['perfil'] === 'ADMINISTRADOR') return true;
    
    // Compare parsed strings cleanly
    const uSede = String(this.currentUserSede()).toLowerCase().trim();
    const sLugar = String(this.selectedLugar()).toLowerCase().trim();
    return uSede === sLugar;
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      // 1. Cargar PENDIENTES (Sigue siendo lista completa por ahora, suelen ser pocas)
      const pending = await this.expedienteService.getPendingDeliveries(this.selectedLugar());
      this.records.set(pending);

      // 2. Calcular rango de fechas para ENTREGADOS
      const { start, end } = this.getDateRange(this.selectedRange());

      // 3. Cargar ENTREGADOS con Filtro y Paginación
      const result = await this.expedienteService.getFilteredDeliveries(
        this.selectedLugar(),
        start,
        end,
        this.deliveredPage(),
        this.deliveredPageSize()
      );

      this.deliveredRecords.set(result.items);
      this.deliveredTotalItems.set(result.totalItems);
    } catch (e: any) {
      this.snackBar.open('Error cargando datos: ' + e.message, 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  private getDateRange(range: string): { start: Date, end: Date } {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (range) {
      case 'ayer':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'semana':
        start.setDate(start.getDate() - 7);
        break;
      case 'mes':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'historico':
        start = new Date(2020, 0, 1, 0, 0, 0, 0); // Desde el inicio
        break;
    }
    return { start, end };
  }

  onPageChange(event: PageEvent) {
    this.deliveredPage.set(event.pageIndex + 1);
    this.deliveredPageSize.set(event.pageSize);
    this.loadData();
  }

  onRangeChange(range: any) {
    this.selectedRange.set(range);
    this.deliveredPage.set(1); // Reset to first page
    this.loadData();
  }

  onLugarChange() {
    this.loadData();
  }

  async marcarEntregado(id: string) {
    if (!confirm('¿Confirmar la entrega de esta licencia al ciudadano?')) return;

    // Observación opcional del entregador (se agrega como log)
    const obs = prompt('Observación de entrega (opcional, deje en blanco para omitir):');
    if (obs === null) return; // Usuario canceló el prompt
    
    this.isLoading.set(true);
    try {
      // Pass observacion as appendObs so it gets stamped with date + initials and appended
      await this.expedienteService.updateExpediente(
        id,
        { estado: 'ENTREGADO' },
        'ENTREGA_LICENCIA',
        obs.trim() || undefined   // undefined = no obs, service skips append
      );
      this.snackBar.open('¡Licencia marcada como entregada!', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
      await this.loadData();
    } catch (e: any) {
      this.snackBar.open('Error confirmando la entrega: ' + e.message, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
      this.isLoading.set(false);
    }
  }
  async observar(id: string) {
    const razon = prompt('Ingrese el motivo de la observación:');
    if (!razon || razon.trim().length < 5) {
      if (razon !== null) this.snackBar.open('Debe ingresar un motivo válido (mínimo 5 caracteres).', 'Cerrar', { duration: 3000 });
      return;
    }
    
    this.isLoading.set(true);
    try {
      // Use appendObs so it is stamped and appended to history
      await this.expedienteService.updateExpediente(
        id,
        { estado: 'OBSERVADO' },
        'MESA_ENTREGAS_OBSERVADO',
        razon.trim()
      );
      this.snackBar.open('El expediente ha sido marcado como OBSERVADO.', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
      await this.loadData();
    } catch (e: any) {
      this.snackBar.open('Error al observar expediente: ' + e.message, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
      this.isLoading.set(false);
    }
  }

  // --- Export Methods ---
  exportExcel() {
    const rows = this.filteredDeliveredRecords().map((r, i) => ({
      'N°': i + 1,
      'DNI Solicitante': r['dni_solicitante'],
      'Apellidos y Nombres': r['apellidos_nombres'],
      'Trámite': r['tramite'],
      'Categoría': r['categoria'],
      'Fecha Entrega': this.datePipe.transform(r['updated'], 'dd/MM/yyyy HH:mm') || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entregas Diarias');
    XLSX.writeFile(wb, `Entregas_Diarias_${this.datePipe.transform(this.currentDate, 'yyyyMMdd')}.xlsx`);
  }

  async exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const user = this.authService.currentUser();
    const date = this.datePipe.transform(this.currentDate, 'dd/MM/yyyy');
    const timeStr = this.datePipe.transform(new Date(), 'HH:mm');
    const total = this.filteredDeliveredRecords().length;

    // Register report & get QR
    const year = this.currentDate.getFullYear();
    const month = String(this.currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.currentDate.getDate()).padStart(2, '0');
    let qrDataUrl = '';
    let reportId = '';
    try {
      const records = this.filteredDeliveredRecords();
      const snapshot = {
        operador: user?.['nombre'] || 'N/A',
        sede: this.selectedLugar(),
        fecha_reporte: `${day}/${month}/${year}`,
        tipo: 'ENTREGA_DIARIA',
        registros: records.map((r, i) => ({
          n: i + 1,
          dni: r['dni_solicitante'] || '',
          nombre: r['apellidos_nombres'] || '',
          tramite: r['tramite'] || '',
          categoria: r['categoria'] || '',
          estado: r['estado'] || '',
          sede: r['lugar_entrega'] || '',
          operador: r.expand?.['operador']?.nombre || '',
          fecha: this.datePipe.transform(r['fecha_registro'], 'dd/MM/yyyy') || '',
          observaciones: r['observaciones'] || ''
        }))
      };
      const { id, verifyUrl } = await this.reporteService.registrarReporte({
        generado_por: user!.id,
        tipo_reporte: 'ENTREGA_DIARIA',
        fecha_reporte: `${year}-${month}-${day}`,
        total_registros: total,
        sede: this.selectedLugar()
      }, snapshot);
      reportId = id;
      qrDataUrl = await this.reporteService.generarQR(verifyUrl);
    } catch (e) {
      console.warn('No se pudo registrar el reporte, continuando sin QR:', e);
    }

    // Header
    const pageW = doc.internal.pageSize.width;
    doc.setFontSize(14);
    doc.text(`DRTC PUNO - Reporte de Entregas Diarias - ${this.selectedLugar()}`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Generado por: ${user?.['nombre'] || 'N/A'} | Fecha/Hora: ${date} ${timeStr} | Total: ${total}`, 14, 22);
    if (reportId) {
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`ID Reporte: ${reportId}`, 14, 27);
      doc.setTextColor(0);
    }

    // QR top-right
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', pageW - 42, 6, 30, 30);
      doc.setFontSize(6);
      doc.setTextColor(120);
      doc.text('Verificar\nautenticidad', pageW - 40, 38);
      doc.setTextColor(0);
    }

    const body = this.filteredDeliveredRecords().map((r, i) => [
      i + 1, 
      r['dni_solicitante'] || 'N/A',
      r['apellidos_nombres'], 
      r['tramite'], 
      r['categoria'],
      this.datePipe.transform(r['updated'], 'dd/MM/yyyy HH:mm') || ''
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['N°', 'DNI Solicitante', 'Apellidos y Nombres', 'Trámite', 'Categoría', 'Fecha Entrega']],
      body: body,
      headStyles: { fillColor: [10, 61, 98] },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [244, 247, 246] }
    });

    doc.save(`Entregas_Diarias_${this.datePipe.transform(this.currentDate, 'yyyyMMdd')}.pdf`);
    this.snackBar.open('PDF generado y registrado en el sistema', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
  }
}
