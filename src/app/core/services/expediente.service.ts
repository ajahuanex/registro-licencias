import { Injectable, inject } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';
import { AuthService } from './auth.service';
import { RecordModel } from 'pocketbase';

export interface ExpedienteCreate {
  operador: string;
  dni_solicitante: string;
  apellidos_nombres: string;
  tramite: string;
  estado: string;
  categoria: string;
  lugar_entrega: string;
  observaciones?: string;
  fecha_registro: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExpedienteService {
  private pbService = inject(PocketbaseService);
  private authService = inject(AuthService);
  private collectionName = 'expedientes';

  /**
   * Registra una acción en el historial de expedientes
   */
  async logHistory(expedienteId: string, accion: string, detalles: string) {
    try {
      const user = this.authService.currentUser();
      if (!user) return;

      await this.pbService.pb.collection('historial_expedientes').create({
        expediente: expedienteId,
        modificado_por: user.id,
        accion: accion,
        detalles: detalles,
        fecha: new Date().toISOString()
      });
    } catch (e) {
      console.error('[HISTORY ERROR] No se pudo guardar el log:', e);
    }
  }

  /**
   * Registers a new valid dossier while preventing daily duplicates.
   */
  async registerExpediente(data: ExpedienteCreate): Promise<RecordModel> {
    // 1. Validation Logic: Same name & same day
    const isDuplicate = await this.checkDuplicate(data.apellidos_nombres, data.fecha_registro);
    if (isDuplicate) {
      throw new Error(`El expediente de ${data.apellidos_nombres} ya fue registrado hoy.`);
    }

    // 2. Persist to DB
    const record = await this.pbService.pb.collection(this.collectionName).create(data);
    
    // 3. Log History
    await this.logHistory(record.id, 'CREACION', 'Expediente registrado por primera vez.');
    return record;
  }

  /**
   * Updates an existing dossier and logs the change.
   */
  async updateExpediente(id: string, data: Partial<ExpedienteCreate>, accionLog: string = 'MODIFICACION'): Promise<RecordModel> {
    const record = await this.pbService.pb.collection(this.collectionName).update(id, data);
    
    // Build detail string dynamically if needed
    const detalles = `Estado actualizado a ${data.estado}. Trámite: ${data.tramite}.`;
    await this.logHistory(record.id, accionLog, detalles);
    return record;
  }

  /**
   * Checks if an exact same name was registered on the target date string (YYYY-MM-DD prefix).
   */
  private async checkDuplicate(apellidosNombres: string, isoDateString: string): Promise<boolean> {
    try {
      // The frontend date might be an ISO string like "2026-03-17T02:13:06.000Z".
      // We extract "2026-03-17" to match only the date in PocketBase.
      const datePrefix = isoDateString.split('T')[0];
      
      const records = await this.pbService.pb.collection(this.collectionName).getList(1, 1, {
        filter: `apellidos_nombres = "${apellidosNombres}" && fecha_registro ~ "${datePrefix}"`
      });

      return records.totalItems > 0;
    } catch (error) {
       console.error("Duplicate Check Error:", error);
       // Fail closed: assume duplicate if there's an error avoiding multiple insertions.
       return true; 
    }
  }

  /**
   * Retrieves all dossiers that are pending delivery (ATENDIDO) for a specific location.
   */
  async getPendingDeliveries(lugar: string): Promise<RecordModel[]> {
    try {
      return await this.pbService.pb.collection('expedientes').getFullList({
        filter: `estado = "ATENDIDO" && lugar_entrega = "${lugar}"`,
        sort: '-fecha_registro'
      });
    } catch (error) {
      console.error('Error fetching pending deliveries:', error);
      throw error;
    }
  }

  async getGlobalHistory(): Promise<RecordModel[]> {
    try {
      return await this.pbService.pb.collection('historial_expedientes').getFullList({
        sort: '-fecha',
        expand: 'modificado_por,expediente'
      });
    } catch (error) {
      console.error('Error fetching global history:', error);
      throw error;
    }
  }

  /**
   * Retrieves the daily summary for all operators or a specific one.
   */
  async getDailyConsolidated(dateStringYYYYMMDD: string, operadorId?: string): Promise<RecordModel[]> {
     try {
       let filterStr = `fecha_registro != ""`; // Fallback to all records to verify connection
       if (operadorId) {
         filterStr += ` && operador = "${operadorId}"`;
       }
       const queryOpts = {
         filter: filterStr,
         sort: '-fecha_registro',
         expand: 'operador'
       };
       console.log("[EXPEDIENTES DEBUG] Ejecutando getFullList con opciones:", queryOpts);
       const result = await this.pbService.pb.collection(this.collectionName).getFullList(queryOpts);
       console.log("[EXPEDIENTES DEBUG] Registros obtenidos:", result.length);
       return result;
     } catch(error: any) {
         console.error("[EXPEDIENTES DEBUG] Failed to load daily report:", error);
         if (error.response) {
            console.error("[EXPEDIENTES DEBUG] PocketBase Response JSON:", JSON.stringify(error.response, null, 2));
         }
        return [];
     }
  }
}
