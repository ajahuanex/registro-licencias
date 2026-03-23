import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { PocketbaseService } from '../core/services/pocketbase.service';
import { RecordModel } from 'pocketbase';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-verificar-reporte',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule, MatButtonModule],
  providers: [DatePipe],
  template: `
<div class="verify-page">
  <div class="verify-card">

    <div class="card-header">
      <img src="/assets/drtc-logo.png" alt="DRTC Puno" class="logo" onerror="this.style.display='none'">
      <div>
        <h2>DRTC Puno</h2>
        <p>Dirección Regional de Transportes y Comunicaciones</p>
      </div>
    </div>

    @if (isLoading()) {
      <div class="loading">
        <div class="spinner"></div>
        <span>Verificando reporte...</span>
      </div>
    } @else if (error()) {
      <div class="result invalid">
        <mat-icon class="result-icon">cancel</mat-icon>
        <h3>Reporte no encontrado</h3>
        <p>El código QR no corresponde a ningún reporte registrado en el sistema DRTC Puno.</p>
        <p class="code-label">ID buscado: <code>{{ reporteId }}</code></p>
      </div>
    } @else if (reporte()) {
      <div class="result valid">
        <mat-icon class="result-icon">verified</mat-icon>
        <h3>Reporte Auténtico ✓</h3>
        <p class="subtitle">Este documento está registrado oficialmente en el sistema DRTC Puno.</p>
      </div>

      <div class="data-grid">
        <div class="data-item">
          <span class="data-label">Tipo de Reporte</span>
          <span class="data-value">{{ reporte()!['tipo_reporte'] === 'REPORTE_DIARIO' ? 'Reporte Diario Consolidado' : 'Reporte de Entregas Diarias' }}</span>
        </div>
        <div class="data-item">
          <span class="data-label">Fecha del Reporte</span>
          <span class="data-value">{{ reporte()!['fecha_reporte'] | date:'dd/MM/yyyy' }}</span>
        </div>
        <div class="data-item">
          <span class="data-label">Generado por</span>
          <span class="data-value">{{ reporte()!['generado_por_nombre'] || 'No especificado' }}</span>
        </div>
        <div class="data-item">
          <span class="data-label">Fecha/Hora de Generación</span>
          <span class="data-value">{{ reporte()!['fecha_generacion'] | date:'dd/MM/yyyy HH:mm' }}</span>
        </div>
        <div class="data-item">
          <span class="data-label">Sede</span>
          <span class="data-value">{{ reporte()!['sede'] || 'Ambas' }}</span>
        </div>
        <div class="data-item">
          <span class="data-label">Total de Registros</span>
          <span class="data-value">{{ reporte()!['total_registros'] }}</span>
        </div>
        <div class="data-item full">
          <span class="data-label">Código de Verificación</span>
          <span class="data-value"><code class="hash">{{ reporte()!['hash_verificacion'] }}</code></span>
        </div>
        <div class="data-item full">
          <span class="data-label">ID de Reporte</span>
          <span class="data-value"><code class="hash">{{ reporte()!.id }}</code></span>
        </div>
      </div>

      <!-- Download button only if snapshot exists -->
      @if (reporte()!['snapshot']?.registros?.length > 0) {
        <div class="download-section">
          <button mat-raised-button color="primary" (click)="descargarCopia()" [disabled]="generando()">
            <mat-icon>download</mat-icon>
            {{ generando() ? 'Generando...' : 'Descargar Copia del Reporte (PDF)' }}
          </button>
          <p class="copy-note">Se descargará una copia con marca de agua "COPIA"</p>
        </div>
      }
    }

    <div class="card-footer">
      <p>Sistema de Registro de Licencias · DRTC Puno</p>
    </div>
  </div>
</div>
  `,
  styles: [`
    .verify-page {
      min-height: 100vh; background: linear-gradient(135deg, #0a3d62 0%, #1a7fbe 100%);
      display: flex; align-items: center; justify-content: center; padding: 1.5rem;
    }
    .verify-card {
      background: white; border-radius: 20px; width: 100%; max-width: 520px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.3); overflow: hidden;
    }
    .card-header {
      background: #0a3d62; color: white; padding: 1.5rem 2rem;
      display: flex; align-items: center; gap: 1rem;
    }
    .logo { width: 48px; height: 48px; object-fit: contain; }
    .card-header h2 { margin: 0; font-size: 1.1rem; }
    .card-header p { margin: 0; font-size: 0.8rem; opacity: 0.8; }
    .loading { display: flex; flex-direction: column; align-items: center; padding: 3rem; gap: 1rem; color: #666; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top-color: #1a4f8f; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .result { text-align: center; padding: 2rem 2rem 1rem; }
    .result.valid .result-icon { font-size: 56px; width: 56px; height: 56px; color: #16a34a; }
    .result.invalid .result-icon { font-size: 56px; width: 56px; height: 56px; color: #dc2626; }
    .result h3 { margin: 0.5rem 0 0.25rem; font-size: 1.4rem; }
    .result.valid h3 { color: #16a34a; }
    .result.invalid h3 { color: #dc2626; }
    .result p { color: #666; margin: 0; font-size: 0.9rem; }
    .subtitle { color: #555 !important; margin-bottom: 0 !important; }
    .code-label { margin-top: 0.5rem !important; font-size: 0.8rem !important; }
    .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 0 1.5rem 1rem; }
    .data-item { padding: 0.65rem 0.75rem; border-bottom: 1px solid #f0f0f0; }
    .data-item.full { grid-column: 1 / -1; }
    .data-label { display: block; font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 2px; }
    .data-value { font-size: 0.95rem; font-weight: 600; color: #1a1a1a; }
    .hash { background: #f0f4f8; padding: 3px 8px; border-radius: 4px; font-size: 0.8em; letter-spacing: 1px; color: #0a3d62; word-break: break-all; }
    .download-section { text-align: center; padding: 1rem 1.5rem; border-top: 1px solid #eee; }
    .download-section button { width: 100%; }
    .copy-note { font-size: 0.75rem; color: #aaa; margin: 6px 0 0; }
    .card-footer { background: #f8fafc; padding: 1rem 2rem; text-align: center; }
    .card-footer p { margin: 0; font-size: 0.78rem; color: #aaa; }
  `]
})
export class VerificarReporteComponent implements OnInit {
  private pbService = inject(PocketbaseService);
  private route = inject(ActivatedRoute);
  private datePipe = inject(DatePipe);

  reporteId = '';
  reporte = signal<RecordModel | null>(null);
  isLoading = signal(true);
  error = signal(false);
  generando = signal(false);

  async ngOnInit() {
    this.reporteId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.reporteId) { this.error.set(true); this.isLoading.set(false); return; }
    try {
      const rec = await this.pbService.pb.collection('reportes_generados').getOne(this.reporteId);
      this.reporte.set(rec);
    } catch {
      this.error.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  descargarCopia() {
    const r = this.reporte();
    if (!r) return;
    const snapshot = r['snapshot'];
    if (!snapshot?.registros?.length) return;

    this.generando.set(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageW = doc.internal.pageSize.width;
      const pageH = doc.internal.pageSize.height;
      const tipoLabel = r['tipo_reporte'] === 'REPORTE_DIARIO' ? 'Reporte Consolidado Diario' : 'Reporte de Entregas Diarias';

      // Header
      doc.setFontSize(14);
      doc.text(`DRTC PUNO - ${tipoLabel} - ${snapshot.fecha_reporte}`, 14, 15);
      doc.setFontSize(9);
      doc.text(`Generado por: ${snapshot.operador} | Sede: ${snapshot.sede} | Total: ${snapshot.registros.length}`, 14, 22);
      doc.setFontSize(7); doc.setTextColor(120);
      doc.text(`ID Reporte: ${r.id} | Hash: ${r['hash_verificacion']}`, 14, 27);
      doc.setTextColor(0);

      // WATERMARK "COPIA"
      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
      doc.setFontSize(80);
      doc.setTextColor(10, 61, 98);
      doc.text('COPIA', pageW / 2, pageH / 2, { align: 'center', angle: 35 });
      doc.restoreGraphicsState();
      doc.setTextColor(0);

      // Table
      autoTable(doc, {
        startY: 32,
        head: [['N°','Fecha','DNI','Apellidos y Nombres','Trámite','Categoría','Lugar Entrega','Estado','Operador','Observaciones']],
        body: snapshot.registros.map((row: any) => [
          row.n, row.fecha, row.dni, row.nombre,
          row.tramite, row.categoria, row.sede,
          row.estado, row.operador, row.observaciones || ''
        ]),
        headStyles: { fillColor: [10, 61, 98] },
        styles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [244, 247, 246] }
      });

      // Footer on all pages
      const pages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(150);
        doc.text(`Pág. ${i}/${pages} — COPIA generada desde verificación QR — ${this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm')}`, pageW / 2, pageH - 5, { align: 'center' });
      }

      doc.save(`COPIA_Reporte_${snapshot.fecha_reporte.replace(/\//g,'')}_${r.id.slice(0,8)}.pdf`);
    } finally {
      this.generando.set(false);
    }
  }
}
