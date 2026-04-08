import { Injectable, inject } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';
import { AuthService } from './auth.service';
import { RecordModel } from 'pocketbase';
import QRCode from 'qrcode';

export interface SnapshotRegistro {
  n: number;
  dni: string;
  nombre: string;
  tramite: string;
  categoria: string;
  estado: string;
  sede: string;
  operador: string;
  fecha: string;
  observaciones?: string;
}

export interface ReporteSnapshot {
  operador: string;
  sede: string;
  fecha_reporte: string;
  tipo: string;
  registros: SnapshotRegistro[];
}

export interface ReporteGenerado {
  id?: string;
  generado_por: string;
  generado_por_nombre: string;
  tipo_reporte: 'REPORTE_DIARIO' | 'ENTREGA_DIARIA';
  fecha_reporte: string;
  total_registros: number;
  sede?: string;
  hash_verificacion: string;
  snapshot?: ReporteSnapshot;
}

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private pbService = inject(PocketbaseService);
  private authService = inject(AuthService);

  private readonly COLLECTION = 'reportes_generados';
  private get BASE_URL(): string {
    const origin = (typeof window !== 'undefined') ? window.location.origin : '';
    return origin + '/verificar/';
  }

  /**
   * Registers a report in PocketBase with a compact JSON snapshot for future PDF regeneration.
   */
  async registrarReporte(
    data: Omit<ReporteGenerado, 'id' | 'hash_verificacion' | 'generado_por_nombre'>,
    snapshot?: ReporteSnapshot
  ): Promise<{ id: string; verifyUrl: string }> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('No hay usuario autenticado');

    // --- Unique-per-day rule for REPORTE_DIARIO ---
    // Delete any existing reports for the same date so only the latest is valid
    if (data.tipo_reporte === 'REPORTE_DIARIO') {
      try {
        const existing = await this.pbService.pb.collection(this.COLLECTION).getFullList({
          filter: `tipo_reporte = 'REPORTE_DIARIO' && fecha_reporte = '${data.fecha_reporte}'`
        });
        await Promise.all(existing.map(r => this.pbService.pb.collection(this.COLLECTION).delete(r.id)));
        if (existing.length > 0) console.log(`[ReporteService] Reemplazados ${existing.length} reporte(s) previo(s) del ${data.fecha_reporte}`);
      } catch (e) {
        console.warn('[ReporteService] No se pudieron eliminar reportes previos:', e);
      }
    }

    const rawHash = `${data.tipo_reporte}-${data.fecha_reporte}-${user.id}-${Date.now()}`;
    const hash = btoa(rawHash).replace(/=/g, '').slice(0, 16).toUpperCase();
    const nombreOperador = user['nombre'] || user['username'] || 'Desconocido';

    const record = await this.pbService.pb.collection(this.COLLECTION).create({
      generado_por: user.id,
      generado_por_nombre: nombreOperador,
      tipo_reporte: data.tipo_reporte,
      fecha_reporte: data.fecha_reporte + ' 00:00:00', // Ensure PB date format
      total_registros: data.total_registros,
      sede: data.sede ? (data.sede.charAt(0).toUpperCase() + data.sede.slice(1).toLowerCase()) : 'Ambas',
      hash_verificacion: hash,
      snapshot: snapshot ?? null
    });

    const verifyUrl = this.BASE_URL + record.id;
    return { id: record.id, verifyUrl };
  }

  /**
   * Generates a QR code as a base64 PNG data URL.
   */
  async generarQR(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      width: 120,
      margin: 1,
      color: { dark: '#0a3d62', light: '#ffffff' }
    });
  }

  /**
   * Fetches all generated reports for the historial module.
   * Note: NO expand used to avoid 400 errors with operadores auth collection.
   * Operator name is stored directly in generado_por_nombre field.
   */
  async getHistorial(): Promise<RecordModel[]> {
    console.log("[DEBUG] getHistorial sin ordenamiento...");
    return this.pbService.pb.collection(this.COLLECTION).getFullList();
  }

  /**
   * Gets a single report by ID for verification.
   */
  async getReporte(id: string): Promise<RecordModel> {
    return this.pbService.pb.collection(this.COLLECTION).getOne(id, {
      expand: 'generado_por'
    });
  }
}
