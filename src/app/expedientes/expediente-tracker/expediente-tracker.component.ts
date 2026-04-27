import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Component, Input, OnInit, inject, signal, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ExpedienteService } from '../../core/services/expediente.service';
import { RecordModel } from 'pocketbase';

@Component({
  selector: 'app-expediente-tracker',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatCardModule, MatDividerModule, MatButtonModule, MatDialogModule],
  template: `
    <div class="tracker-container" [class.is-dialog]="isDialog">
      @if (isDialog) {
        <div class="tracker-header">
          <h2>Historial de Seguimiento</h2>
          <button mat-icon-button (click)="closeDialog()"><mat-icon>close</mat-icon></button>
        </div>
      }

      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando historial...</p>
        </div>
      } @else if (history().length === 0) {
        <div class="empty-state">
          <mat-icon>history_toggle_off</mat-icon>
          <p>No hay eventos registrados para este expediente.</p>
        </div>
      } @else {
        <div class="timeline">
          @for (event of history(); track event.id; let first = $first) {
            <div class="timeline-item" [class.active]="first">
              <div class="timeline-marker">
                <div class="marker-icon" [ngClass]="getIconClass(event['accion'])">
                  <mat-icon>{{ getIcon(event['accion']) }}</mat-icon>
                </div>
                <div class="timeline-line"></div>
              </div>
              <div class="timeline-content">
                <div class="event-header">
                  <span class="event-action">{{ event['accion'] }}</span>
                  <span class="event-date">{{ event['fecha'] | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <div class="event-details">
                  <p class="detail-text">{{ event['detalles'] }}</p>
                  @if (event['estado_nuevo']) {
                    <div class="status-change">
                      <span class="status-label">Nuevo Estado:</span>
                      <span class="status-badge" [ngClass]="event['estado_nuevo']">{{ event['estado_nuevo'] }}</span>
                    </div>
                  }
                </div>
                <div class="event-footer">
                  <mat-icon>person</mat-icon>
                  <span>{{ event['operador_nombre'] }}</span>
                  <span class="perfil">({{ event['operador_perfil'] }})</span>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .tracker-container { padding: 1rem; max-height: 70vh; overflow-y: auto; }
    .tracker-container.is-dialog { max-height: 85vh; padding: 1.5rem; }
    .tracker-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem; }
    .tracker-header h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1e293b; }

    .loading-state, .empty-state {
      display: flex; flex-direction: column; align-items: center; padding: 3rem; color: #666;
    }
    .spinner {
      width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #2196F3;
      border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    .timeline { position: relative; padding-left: 3rem; }
    .timeline-item { position: relative; padding-bottom: 2rem; }
    .timeline-item:last-child { padding-bottom: 0; }
    .timeline-marker {
      position: absolute; left: -3rem; top: 0; height: 100%;
      display: flex; flex-direction: column; align-items: center;
    }
    .marker-icon {
      width: 40px; height: 40px; border-radius: 50%; background: #e0e0e0;
      display: flex; align-items: center; justify-content: center; z-index: 2;
      color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .timeline-line { width: 2px; background: #e0e0e0; flex-grow: 1; margin: 4px 0; }
    .timeline-item:last-child .timeline-line { display: none; }
    
    .timeline-content {
      background: white; border-radius: 12px; padding: 1rem 1.25rem;
      border: 1px solid #f0f0f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      transition: all 0.2s ease;
    }
    .timeline-item.active .timeline-content {
      border-left: 4px solid #2563eb;
      box-shadow: 0 8px 16px rgba(37, 99, 235, 0.08);
    }
    
    .event-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .event-action { font-weight: 700; font-size: 0.9rem; color: #1a1a1a; letter-spacing: 0.5px; }
    .event-date { font-size: 0.8rem; color: #888; }
    .detail-text { font-size: 0.9rem; line-height: 1.4; color: #444; margin: 0.25rem 0; }
    .status-change { margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
    .status-label { font-size: 0.8rem; color: #666; }
    .status-badge {
      padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;
      text-transform: uppercase; background: #eee;
    }
    
    /* Dynamic Colors */
    .CREACION { background: #16a34a; }
    .MODIFICACION, .MODIFICACION_REGISTRADOR { background: #2563eb; }
    .MARCADO_RAPIDO_IMPRESO, .IMPRESO { background: #8b5cf6; }
    .MARCADO_RAPIDO_VERIFICADO, .VERIFICADO { background: #f59e0b; }
    .MARCADO_RAPIDO_ENTREGA, .ENTREGADO, .ATENDIDO { background: #10b981; }
    .OBSERVADO, .REVERTIR_IMPRESION, .REVERTIR_VERIFICACION { background: #ef4444; }
    
    .event-footer {
      margin-top: 0.75rem; display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.8rem; color: #666; border-top: 1px solid #f9f9f9; padding-top: 0.5rem;
    }
    .event-footer mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .perfil { font-style: italic; opacity: 0.8; }
  `]
})
export class ExpedienteTrackerComponent implements OnInit {
  @Input() expedienteId!: string;
  isDialog = false;

  private expedienteService = inject(ExpedienteService);
  private dialogData = inject(MAT_DIALOG_DATA, { optional: true });
  private dialogRef = inject(MatDialogRef<ExpedienteTrackerComponent>, { optional: true });

  history = signal<RecordModel[]>([]);
  isLoading = signal(true);

  async ngOnInit() {
    if (this.dialogData?.expedienteId) {
      this.expedienteId = this.dialogData.expedienteId;
      this.isDialog = true;
    }
    
    if (this.expedienteId) {
      await this.loadHistory();
    }
  }

  async loadHistory() {
    this.isLoading.set(true);
    try {
      const data = await this.expedienteService.getHistoryByExpediente(this.expedienteId);
      this.history.set(data);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  closeDialog() {
    this.dialogRef?.close();
  }

  getIcon(accion: string): string {
    if (accion.includes('CREACION')) return 'add_circle';
    if (accion.includes('IMPRESO')) return 'print';
    if (accion.includes('VERIFICADO')) return 'verified_user';
    if (accion.includes('ENTREGA')) return 'handshake';
    if (accion.includes('REVERTIR')) return 'undo';
    if (accion.includes('OBSERVADO')) return 'error_outline';
    return 'edit';
  }

  getIconClass(accion: string): string {
    return accion;
  }
}
