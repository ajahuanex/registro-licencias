import { Injectable, inject } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';
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
  private collectionName = 'expedientes';

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
    return await this.pbService.pb.collection(this.collectionName).create(data);
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
        filter: `apellidos_nombres = "${apellidosNombres}" && fecha_registro >= "${datePrefix} 00:00:00" && fecha_registro <= "${datePrefix} 23:59:59"`
      });

      return records.totalItems > 0;
    } catch (error) {
       console.error("Duplicate Check Error:", error);
       // Fail closed: assume duplicate if there's an error avoiding multiple insertions.
       return true; 
    }
  }

  /**
   * Retrieves the daily summary for all operators or a specific one.
   */
  async getDailyConsolidated(dateStringYYYYMMDD: string, operadorId?: string): Promise<RecordModel[]> {
     try {
       let filterStr = `fecha_registro >= "${dateStringYYYYMMDD} 00:00:00" && fecha_registro <= "${dateStringYYYYMMDD} 23:59:59"`;
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
