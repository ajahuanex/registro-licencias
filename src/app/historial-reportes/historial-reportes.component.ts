import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RecordModel } from 'pocketbase';
import { ReporteService } from '../core/services/reporte.service';
import { AuthService } from '../core/services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-historial-reportes',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    MatCardModule, MatTableModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatSnackBarModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule
  ],
  providers: [DatePipe],
  template: `
<div class="page-wrapper fade-in">
  <div class="page-header">
    <div>
      <h1><mat-icon>verified</mat-icon> Historial de Reportes Generados</h1>
      <p>Registro de todos los PDFs generados por el sistema. Usa el código del reporte para verificar su autenticidad.</p>
    </div>
    <button mat-icon-button matTooltip="Actualizar" (click)="loadData()">
      <mat-icon [class.rolling]="isLoading()">sync</mat-icon>
    </button>
  </div>

  <mat-card class="mat-elevation-z3">
    @if (isLoading()) {
      <div class="loading-overlay">
        <div class="spinner"></div><span>Cargando registros...</span>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="reportes()">

          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef>Fecha/Hora Generación</th>
            <td mat-cell *matCellDef="let r">
              <div class="date-cell">
                <strong>{{ r['fecha_generacion'] | date:'dd/MM/yyyy' }}</strong>
                <span>{{ r['fecha_generacion'] | date:'HH:mm' }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="tipo">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let r">
              <span class="type-chip" [class.diario]="r['tipo_reporte'] === 'REPORTE_DIARIO'">
                <mat-icon>{{ r['tipo_reporte'] === 'REPORTE_DIARIO' ? 'summarize' : 'local_shipping' }}</mat-icon>
                {{ r['tipo_reporte'] === 'REPORTE_DIARIO' ? 'Reporte Diario' : 'Entrega Diaria' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="generado_por">
            <th mat-header-cell *matHeaderCellDef>Generado por</th>
            <td mat-cell *matCellDef="let r">
              <span class="badge op-badge">{{ r['generado_por_nombre'] || 'Desconocido' }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="fecha_reporte">
            <th mat-header-cell *matHeaderCellDef>Fecha del Reporte</th>
            <td mat-cell *matCellDef="let r">{{ r['fecha_reporte'] | date:'dd/MM/yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="sede">
            <th mat-header-cell *matHeaderCellDef>Sede</th>
            <td mat-cell *matCellDef="let r">{{ r['sede'] || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="total">
            <th mat-header-cell *matHeaderCellDef style="text-align:center">Registros</th>
            <td mat-cell *matCellDef="let r" style="text-align:center">
              <strong>{{ r['total_registros'] }}</strong>
            </td>
          </ng-container>

          <ng-container matColumnDef="hash">
            <th mat-header-cell *matHeaderCellDef>Código de Verificación</th>
            <td mat-cell *matCellDef="let r">
              <code class="hash-code">{{ r['hash_verificacion'] }}</code>
            </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef style="text-align:center">QR</th>
            <td mat-cell *matCellDef="let r" style="text-align:center">
              <button mat-icon-button color="primary" matTooltip="Ver QR de verificación" (click)="verQR(r)">
                <mat-icon>qr_code_2</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let r; columns: cols;" class="table-row-hover"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell empty-cell" [attr.colspan]="cols.length">No hay reportes generados aún.</td>
          </tr>
        </table>
      </div>

      <!-- Stats footer -->
      <div class="stats-bar">
        <span><mat-icon>description</mat-icon> <strong>{{ reportes().length }}</strong> reportes generados en total</span>
        <span><mat-icon>summarize</mat-icon> <strong>{{ totalDiarios() }}</strong> reportes diarios</span>
        <span><mat-icon>local_shipping</mat-icon> <strong>{{ totalEntregas() }}</strong> reportes de entregas</span>
      </div>
    }
  </mat-card>

  <!-- QR Preview Modal -->
  @if (qrData()) {
    <div class="qr-overlay" (click)="qrData.set(null)">
      <div class="qr-modal" (click)="$event.stopPropagation()">
        <button class="qr-close" (click)="qrData.set(null)">
          <mat-icon>close</mat-icon>
        </button>
        <h3><mat-icon>verified</mat-icon> Verificación de Reporte</h3>
        <img [src]="qrData()!.qrImg" alt="QR Verificación" class="qr-image">
        <div class="qr-info">
          <p><strong>Código:</strong> <code>{{ qrData()!.hash }}</code></p>
          <p><strong>Tipo:</strong> {{ qrData()!.tipo }}</p>
          <p><strong>Generado por:</strong> {{ qrData()!.nombre }}</p>
          <p><strong>Fecha Reporte:</strong> {{ qrData()!.fechaReporte }}</p>
          <p><strong>Registros:</strong> {{ qrData()!.total }}</p>
        </div>
        <!-- Enlace directo para probar la URL -->
        <div class="verify-link-box">
          <a [href]="qrData()!.verifyUrl" target="_blank" class="verify-link">
            <mat-icon>open_in_new</mat-icon> Abrir verificación en nueva pestaña
          </a>
          <p class="url-label">{{ qrData()!.verifyUrl }}</p>
        </div>
        <p class="qr-hint">Escanea el QR para verificar la autenticidad de este reporte</p>
      </div>
    </div>
  }
</div>
  `,
  styles: [`
    .page-wrapper { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; }
    .page-header h1 { display: flex; align-items: center; gap: 8px; font-size: 1.4rem; margin: 0 0 4px; }
    .page-header p { color: #666; margin: 0; font-size: 0.9rem; }
    .table-container { overflow-x: auto; }
    table { width: 100%; }
    .date-cell { display: flex; flex-direction: column; line-height: 1.3; }
    .date-cell span { font-size: 0.8em; color: #888; }
    .type-chip { display: flex; align-items: center; gap: 4px; font-size: 0.85rem; font-weight: 500; }
    .type-chip.diario { color: #1a4f8f; }
    .type-chip mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .hash-code { background: #f0f4f8; padding: 3px 8px; border-radius: 4px; font-size: 0.85em; letter-spacing: 1px; color: #0a3d62; }
    .stats-bar { display: flex; gap: 2rem; padding: 1rem 1.5rem; border-top: 1px solid #eee; color: #555; font-size: 0.9rem; }
    .stats-bar span { display: flex; align-items: center; gap: 6px; }
    .stats-bar mat-icon { font-size: 18px; color: #1a4f8f; }
    .loading-overlay { display: flex; flex-direction: column; align-items: center; padding: 3rem; gap: 1rem; color: #666; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e0e0e0; border-top-color: #1a4f8f; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* QR Overlay */
    .qr-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px); }
    .qr-modal { background: #fff; border-radius: 16px; padding: 2rem; width: 340px; text-align: center; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .qr-modal h3 { display: flex; align-items: center; justify-content: center; gap: 8px; color: #0a3d62; margin: 0 0 1rem; }
    .qr-image { width: 160px; height: 160px; border: 8px solid #f0f4f8; border-radius: 8px; }
    .qr-info { text-align: left; margin: 1rem 0; background: #f8fafc; border-radius: 8px; padding: 0.75rem 1rem; }
    .qr-info p { margin: 4px 0; font-size: 0.85rem; color: #333; }
    .qr-hint { font-size: 0.78rem; color: #888; margin-top: 0.75rem; }
    .qr-close { position: absolute; top: 12px; right: 12px; background: none; border: none; cursor: pointer; color: #999; display: flex; }
    .verify-link-box { margin: 0.75rem 0 0; text-align: center; }
    .verify-link { display: inline-flex; align-items: center; gap: 4px; font-size: 0.85rem; color: #1a7fbe; text-decoration: none; font-weight: 600; padding: 6px 12px; border: 1px solid #1a7fbe; border-radius: 20px; transition: background 0.2s; }
    .verify-link:hover { background: #e8f4ff; }
    .verify-link mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .url-label { font-size: 0.7rem; color: #aaa; word-break: break-all; margin: 6px 0 0; }
    .localhost-warn { display: flex; align-items: flex-start; gap: 4px; font-size: 0.78rem; color: #b45309; background: #fef3c7; border-radius: 6px; padding: 6px 8px; margin-top: 6px; text-align: left; }
    .localhost-warn mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
  `]
})
export class HistorialReportesComponent implements OnInit {
  private reporteService = inject(ReporteService);
  private datePipe = inject(DatePipe);

  reportes = signal<RecordModel[]>([]);
  isLoading = signal(true);
  qrData = signal<{ qrImg: string; hash: string; tipo: string; nombre: string; fechaReporte: string; total: number; verifyUrl: string } | null>(null);

  cols = ['created', 'tipo', 'generado_por', 'fecha_reporte', 'sede', 'total', 'hash', 'acciones'];

  get totalDiarios() {
    return () => this.reportes().filter(r => r['tipo_reporte'] === 'REPORTE_DIARIO').length;
  }
  get totalEntregas() {
    return () => this.reportes().filter(r => r['tipo_reporte'] === 'ENTREGA_DIARIA').length;
  }

  async ngOnInit() { await this.loadData(); }

  async loadData() {
    this.isLoading.set(true);
    try {
      const data = await this.reporteService.getHistorial();
      this.reportes.set(data);
    } finally {
      this.isLoading.set(false);
    }
  }

  async verQR(reporte: RecordModel) {
    const origin = (typeof window !== 'undefined') ? window.location.origin : '';
    const verifyUrl = origin + '/verificar/' + reporte.id;
    const qrImg = await this.reporteService.generarQR(verifyUrl);
    this.qrData.set({
      qrImg,
      hash: reporte['hash_verificacion'],
      tipo: reporte['tipo_reporte'] === 'REPORTE_DIARIO' ? 'Reporte Diario' : 'Entrega Diaria',
      nombre: reporte['generado_por_nombre'] || 'Desconocido',
      fechaReporte: this.datePipe.transform(reporte['fecha_reporte'], 'dd/MM/yyyy') || '',
      total: reporte['total_registros'],
      verifyUrl
    });
  }
}
