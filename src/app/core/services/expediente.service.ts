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
   * Registra una acción en el historial de expedientes.
   * Usa campos de texto plano (sin relaciones PB) para máxima robustez.
   */
  async logHistory(
    expedienteId: string,
    accion: string,
    detalles: string,
    opts?: { estadoAnterior?: string; estadoNuevo?: string; dniSolicitante?: string }
  ) {
    try {
      // Usamos el usuario actual (puede ser el impersonado) en vez de solo el authStore (el admin real)
      const user = this.authService.currentUser();
      const model = user || this.pbService.pb.authStore.model;
      if (!model) {
        console.warn('[HISTORY] No hay usuario para loguear accion:', accion);
        return;
      }

      const payload = {
        expediente_id:   expedienteId,
        expediente_dni:  opts?.dniSolicitante || '',
        operador_id:     model.id || 'unknown',
        operador_nombre: model['nombre'] || model['username'] || 'Desconocido',
        operador_perfil: model['perfil'] || '',
        accion,
        estado_anterior: opts?.estadoAnterior || '',
        estado_nuevo:    opts?.estadoNuevo || '',
        detalles:        detalles?.trim() || 'Log de sistema'
      };
      
      console.log("[HISTORY DEBUG] Intentando guardar log:", payload);
      await this.pbService.pb.collection('historial_acciones').create(payload);
    } catch (e: any) {
      console.error('[HISTORY ERROR] No se pudo guardar el log:', e);
      if (e.response) {
        console.error('[HISTORY ERROR] Detalles de PB:', JSON.stringify(e.response, null, 2));
      }
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
   * Builds a new observation log entry appended to any existing observations.
   * Format: existing\n[DD/MM HH:mm - SIGLAS]: nueva observación
   */
  private buildObservacionLog(existing: string, nueva: string, userName: string): string {
    if (!nueva?.trim()) return existing || '';

    const now = new Date();
    const dd   = String(now.getDate()).padStart(2, '0');
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const hh   = String(now.getHours()).padStart(2, '0');
    const min  = String(now.getMinutes()).padStart(2, '0');

    // Build initials: up to 3 uppercase letters from each word
    const siglas = (userName || 'USR')
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0].toUpperCase())
      .join('')
      .slice(0, 3);

    const entry = `[${dd}/${mm} ${hh}:${min}-${siglas}]: ${nueva.trim()}`;
    return existing?.trim() ? `${existing.trim()}\n${entry}` : entry;
  }

  /**
   * Updates an existing dossier and logs the change.
   * Fetches the current record first so required fields are always present in the PATCH payload,
   * preventing 400 errors on old records that may be missing some fields.
   * 
   * When `appendObs` is provided, it is APPENDED to existing observations (log mode).
   * When `data.observaciones` is provided without `appendObs`, it REPLACES (modal direct-edit mode).
   */
  async updateExpediente(
    id: string,
    data: Partial<ExpedienteCreate>,
    accionLog: string = 'MODIFICACION',
    appendObs?: string                // pass the NEW observation text here for append mode
  ): Promise<RecordModel> {
    // Read the current record to get ALL required fields
    const current = await this.pbService.pb.collection(this.collectionName).getOne(id);

    // Resolve observaciones
    const existingObs = current['observaciones'] || '';
    let finalObs: string;
    if (appendObs !== undefined) {
      // Append-log mode: stamp new text with date + user initials
      const user = this.authService.currentUser();
      const userName = user?.['nombre'] || user?.['username'] || 'USR';
      finalObs = this.buildObservacionLog(existingObs, appendObs, userName);
    } else {
      // Direct-edit mode (from modal): use whatever data.observaciones says, or keep existing
      finalObs = data.observaciones !== undefined ? data.observaciones : existingObs;
    }

    // Build a safe payload: start from current values, override with requested changes
    const safePayload: any = {
      operador:          current['operador']          || '',
      dni_solicitante:   current['dni_solicitante']   || '00000000',
      apellidos_nombres: current['apellidos_nombres'] || '',
      tramite:           current['tramite']           || 'Duplicado',
      estado:            current['estado']            || 'EN PROCESO',
      categoria:         current['categoria']         || 'AI',
      lugar_entrega:     current['lugar_entrega']     || 'Puno',
      fecha_registro:    current['fecha_registro']    || new Date().toISOString(),
      ...data,
      observaciones: finalObs   // always use the resolved value
    };

    const record = await this.pbService.pb.collection(this.collectionName).update(id, safePayload);
    
    const detalles = `Estado: ${safePayload.estado}. Obs: ${finalObs ? finalObs.slice(0, 80) + (finalObs.length > 80 ? '…' : '') : 'Sin obs.'}`;
    await this.logHistory(record.id, accionLog, detalles, { dniSolicitante: safePayload.dni_solicitante });
    return record;
  }


  /**
   * Checks if an exact same name was registered on the target date string (YYYY-MM-DD prefix).
   */
  private async checkDuplicate(apellidosNombres: string, isoDateString: string): Promise<boolean> {
    try {
      // Create local boundary dates based on the input Date string 
      const date = new Date(isoDateString);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
      
      const records = await this.pbService.pb.collection(this.collectionName).getList(1, 1, {
        filter: `apellidos_nombres = "${apellidosNombres}" && fecha_registro >= "${start.toISOString().replace('T', ' ')}" && fecha_registro <= "${end.toISOString().replace('T', ' ')}"`
      });

      return records.totalItems > 0;
    } catch (error) {
       console.error("Duplicate Check Error:", error);
       // Fail closed: assume duplicate if there's an error avoiding multiple insertions.
       return true; 
    }
  }

  /**
   * Retrieves all dossiers that are pending delivery (VERIFICADO) for a specific location.
   */
  async getPendingDeliveries(lugar: string): Promise<RecordModel[]> {
    try {
      return await this.pbService.pb.collection('expedientes').getFullList({
        filter: `estado = "VERIFICADO" && lugar_entrega = "${lugar}"`,
        sort: '-fecha_registro'
      });
    } catch (error) {
      console.error('Error fetching pending deliveries:', error);
      throw error;
    }
  }

  /**
   * Retrieves all dossiers that were delivered today at a specific location.
   */
  async getDailyDeliveries(lugar: string, dateStringYYYYMMDD: string): Promise<RecordModel[]> {
    try {
      const [year, month, day] = dateStringYYYYMMDD.split('-').map(Number);
      const start = new Date(year, month - 1, day, 0, 0, 0, 0);
      const end = new Date(year, month - 1, day, 23, 59, 59, 999);

      const filterStr = `estado = "ENTREGADO" && lugar_entrega = "${lugar}" && updated >= "${start.toISOString().replace('T', ' ')}" && updated <= "${end.toISOString().replace('T', ' ')}"`;

      return await this.pbService.pb.collection('expedientes').getFullList({
        filter: filterStr,
        sort: '-updated'
      });
    } catch (error: any) {
      console.error('Error fetching daily deliveries:', error);
      if (error.response) {
        console.error('PB Error Data:', JSON.stringify(error.response, null, 2));
      }
      return [];
    }
  }

  /**
   * Retrieves paginated deliveries for a specific location and date range.
   */
  async getFilteredDeliveries(
    lugar: string, 
    start: Date, 
    end: Date, 
    page: number = 1, 
    perPage: number = 20
  ): Promise<{ items: RecordModel[], totalItems: number }> {
    try {
      const filterStr = `estado = "ENTREGADO" && lugar_entrega = "${lugar}" && updated >= "${start.toISOString().replace('T', ' ')}" && updated <= "${end.toISOString().replace('T', ' ')}"`;

      const result = await this.pbService.pb.collection(this.collectionName).getList(page, perPage, {
        filter: filterStr,
        sort: '-updated'
      });

      return {
        items: result.items,
        totalItems: result.totalItems
      };
    } catch (error: any) {
      console.error('Error fetching filtered deliveries:', error);
      return { items: [], totalItems: 0 };
    }
  }

  async getGlobalHistory(): Promise<RecordModel[]> {
    try {
      return await this.pbService.pb.collection('historial_expedientes').getFullList({
        sort: '-created'
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
       const [year, month, day] = dateStringYYYYMMDD.split('-').map(Number);
       const start = new Date(year, month - 1, day, 0, 0, 0, 0);
       const end = new Date(year, month - 1, day, 23, 59, 59, 999);

       let filterStr = `fecha_registro >= "${start.toISOString().replace('T', ' ')}" && fecha_registro <= "${end.toISOString().replace('T', ' ')}"`;
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

  /**
   * Obtiene el historial de atenciones (impresiones) de un operador específico.
   * Utiliza 'expand' para traer los datos del expediente relacionado.
   */
  async getMisAtenciones(operadorId: string): Promise<RecordModel[]> {
    try {
      const options = {
        filter: `operador_id = "${operadorId}" && (accion = "MARCADO_RAPIDO_IMPRESO" || accion = "MARCADO_MASIVO_IMPRESO" || accion = "PROCESO_MASIVO_IMPRESOR" || accion = "EDICION_FORMULARIO")`,
        sort: '-id'
      };
      const logs = await this.pbService.pb.collection('historial_acciones').getFullList(options);

      // Solo consideramos los logs que verdaderamente pasaron a estado IMPRESO, si estamos incluyendo EDICION_FORMULARIO
      const impresionesLogs = logs.filter(l => 
        l['accion'].includes('IMPRESO') || l['estado_nuevo'] === 'IMPRESO' || 
        (l['detalles'] && l['detalles'].includes('Estado: IMPRESO'))
      );

      if (impresionesLogs.length === 0) return [];

      // 2. Obtener IDs únicos de expedientes
      const ids = [...new Set(impresionesLogs.map(l => l['expediente_id']))].filter(id => !!id);
      
      // 3. Cargar expedientes por bloques (chunks de 40) para no saturar el largo del filtro (error 400)
      const chunkSize = 40;
      let exps: RecordModel[] = [];
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const chunkExps = await this.pbService.pb.collection('expedientes').getFullList({
          filter: chunk.map(id => `id = "${id}"`).join(' || ')
        });
        exps = [...exps, ...chunkExps];
      }

      // 4. Mapear los datos del expediente al objeto "expand" del log
      const expMap = new Map(exps.map(e => [e.id, e]));
      
      return impresionesLogs.map(log => {
        const exp = expMap.get(log['expediente_id']);
        if (exp) {
          (log as any).expand = { expediente_id: exp };
        }
        return log;
      });

    } catch (error) {
      console.error('Error fetching mis atenciones:', error);
      return [];
    }
  }
}
