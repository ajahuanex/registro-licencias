import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ExpedienteService } from '../../core/services/expediente.service';
import { RecordModel } from 'pocketbase';

import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// Because jspdf-autotable extends jsPDF we might need to cast
const jsPDFAutoTable = jsPDF as any;

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
    MatDividerModule
  ],
  providers: [DatePipe],
  templateUrl: './diario.component.html',
  styleUrl: './diario.component.scss'
})
export class DiarioComponent implements OnInit {
  private expedienteService = inject(ExpedienteService);
  private datePipe = inject(DatePipe);

  records = signal<RecordModel[]>([]);
  isLoading = signal<boolean>(true);
  
  displayedColumns: string[] = ['fecha', 'operador', 'dni', 'apellidos_nombres', 'tramite', 'categoria', 'lugar', 'observaciones'];
  
  currentDate = new Date();

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
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

  exportToExcel() {
    const dataToExport = this.records().map(r => ({
      Fecha: this.datePipe.transform(r['fecha_registro'], 'dd/MM/yyyy HH:mm'),
      Operador: r.expand?.['operador']?.['nombre'] || 'N/A',
      DNI: r.expand?.['operador']?.['dni'] || 'N/A',
      'Apellidos y Nombres': r['apellidos_nombres'],
      Trámite: r['tramite'],
      Categoría: r['categoria'],
      'Lugar de Entrega': r['lugar_entrega'],
      Observaciones: r['observaciones']
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Diario');

    const fileName = `Reporte_Expedientes_${this.datePipe.transform(this.currentDate, 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  exportToPDF() {
    const doc = new jsPDFAutoTable();
    doc.text(`Reporte Consolidado Diario - DRTC Puno (${this.datePipe.transform(this.currentDate, 'dd/MM/yyyy')})`, 14, 15);

    const bodyData = this.records().map(r => [
      this.datePipe.transform(r['fecha_registro'], 'dd/MM/yyyy HH:mm'),
      r.expand?.['operador']?.['nombre'] || 'N/A',
      r['apellidos_nombres'],
      r['tramite'],
      r['categoria'],
      r['lugar_entrega']
    ]);

    doc.autoTable({
      head: [['Fecha', 'Operador', 'Solicitante', 'Trámite', 'Categ.', 'Lugar']],
      body: bodyData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [10, 61, 98] }
    });

    doc.save(`Reporte_Expedientes_${this.datePipe.transform(this.currentDate, 'yyyyMMdd')}.pdf`);
  }

  printReport() {
    window.print();
  }
}
