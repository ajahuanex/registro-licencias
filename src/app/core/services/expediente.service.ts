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
  fecha_entrega?: string; // New field for delivery date
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
        expediente_id: expedienteId,
        expediente_dni: opts?.dniSolicitante || '',
        operador_id: model.id || 'unknown',
        operador_nombre: model['nombre'] || model['username'] || 'Desconocido',
        operador_perfil: model['perfil'] || '',
        accion,
        fecha: new Date().toISOString(),
        estado_anterior: opts?.estadoAnterior || '',
        estado_nuevo: opts?.estadoNuevo || '',
        detalles: detalles?.trim() || 'Log de sistema'
      };

      console.log("[HISTORY DEBUG] Intentando guardar log:", payload);
      await Promise.all([
        this.pbService.pb.collection('historial_acciones').create(payload),
        this.pbService.pb.collection('historial_expedientes').create(payload)
      ]);
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
    if (!data.fecha_registro) data.fecha_registro = new Date().toISOString();
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
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

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
      operador: current['operador'] || '',
      dni_solicitante: current['dni_solicitante'] || '00000000',
      apellidos_nombres: current['apellidos_nombres'] || '',
      tramite: current['tramite'] || 'Duplicado',
      estado: current['estado'] || 'EN PROCESO',
      categoria: current['categoria'] || 'AI',
      lugar_entrega: current['lugar_entrega'] || 'Puno',
      fecha_registro: current['fecha_registro'] || new Date().toISOString(),
      ...data,
      observaciones: finalObs   // always use the resolved value
    };

    // If status is ENTREGADO and fecha_entrega is not provided, set it to now
    if (safePayload.estado === 'ENTREGADO' && !safePayload.fecha_entrega) {
      safePayload.fecha_entrega = new Date().toISOString();
    }

    const record = await this.pbService.pb.collection(this.collectionName).update(id, safePayload);

    const detalles = `Estado: ${safePayload.estado}. Obs: ${finalObs ? finalObs.slice(0, 80) + (finalObs.length > 80 ? '…' : '') : 'Sin obs.'}`;
    await this.logHistory(record.id, accionLog, detalles, { dniSolicitante: safePayload.dni_solicitante });
    return record;
  }

  private toPbDate(date: Date): string {
    // PocketBase >= 0.22 strictly requires RFC3339 for system date fields ('updated', 'created')
    // toISOString gives YYYY-MM-DDTHH:mm:ss.SSSZ. Replacing 'T' with space matches PB convention.
    return date.toISOString().replace('T', ' ');
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

      const filterStr = `apellidos_nombres = '${apellidosNombres}' && fecha_registro >= '${this.toPbDate(start)}' && fecha_registro <= '${this.toPbDate(end)}'`;

      const records = await this.pbService.pb.collection(this.collectionName).getList(1, 1, {
        filter: filterStr
      });

      return records.totalItems > 0;
    } catch (error) {
      console.error('Duplicate Check Error:', error);
      // Fail closed: assume duplicate if there's an error avoiding multiple insertions.
      return true;
    }
  }

  /**
   * Retrieves all dossiers that are pending delivery (VERIFICADO) for a specific location.
   */
  async getPendingDeliveries(lugar: string): Promise<RecordModel[]> {
    try {
      const filterBase = `estado = 'VERIFICADO'`;
      const filterStr = (lugar && lugar !== 'TODAS') ? `${filterBase} && lugar_entrega = '${lugar}'` : filterBase;

      return await this.pbService.pb.collection('expedientes').getFullList({
        filter: filterStr
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

      // Backend (PocketBase remote) throws 400 when filtering by updated.
      // Using fecha_registro instead to safely fetch records.
      const filterStr = `estado = 'ENTREGADO' && lugar_entrega = '${lugar}' && fecha_registro >= "${this.toPbDate(start)}" && fecha_registro <= "${this.toPbDate(end)}"`;

      return await this.pbService.pb.collection('expedientes').getFullList({
        filter: filterStr
      });
    } catch (error: any) {
      console.error('Error fetching daily deliveries:', error);
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
    perPage: number = 20,
    states: string[] = ['ENTREGADO'],
    operadorId?: string
  ): Promise<{ items: RecordModel[], totalItems: number }> {
    try {
      let filterStr = `(${states.map(s => `estado = '${s}'`).join(' || ')})`;
      if (lugar && lugar !== 'TODAS') {
        filterStr = `lugar_entrega = '${lugar}' && ${filterStr}`;
      }
      if (operadorId) {
        filterStr = `operador = '${operadorId}' && ${filterStr}`;
      }
      
      // Use both fecha_entrega (for deliveries) and updated (for other states) as fallback range
      // This is a bit complex for PB filters, so we'll use a safer combined filter
      const dateFilter = `(fecha_entrega >= "${this.toPbDate(start)}" && fecha_entrega <= "${this.toPbDate(end)}") || (updated >= "${this.toPbDate(start)}" && updated <= "${this.toPbDate(end)}")`;
      
      filterStr = `${filterStr} && (${dateFilter})`;

      const result = await this.pbService.pb.collection(this.collectionName).getList(page, perPage, {
        filter: filterStr,
        sort: '-updated' // Most recent actions first
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
      return await this.pbService.pb.collection('historial_expedientes').getFullList();
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

      let filterStr = `fecha_registro >= '${this.toPbDate(start)}' && fecha_registro <= '${this.toPbDate(end)}'`;
      if (operadorId) {
        filterStr += ` && operador = '${operadorId}'`;
      }
      const queryOpts = {
        filter: filterStr,
        expand: 'operador'
      };
      console.log("[EXPEDIENTES DEBUG] Ejecutando getFullList con opciones:", queryOpts);
      const result = await this.pbService.pb.collection(this.collectionName).getFullList(queryOpts);
      console.log("[EXPEDIENTES DEBUG] Registros obtenidos:", result.length);
      return result;
    } catch (error: any) {
      console.error("[EXPEDIENTES DEBUG] Failed to load daily report:", error);
      if (error.response) {
        console.error("[EXPEDIENTES DEBUG] PocketBase Response JSON:", JSON.stringify(error.response, null, 2));
      }
      return [];
    }
  }
  /**
   * Retrieves records within a date range using fecha_registro.
   */
  async getByDateRange(start: Date, end: Date, filterExtra?: string): Promise<RecordModel[]> {
    try {
      let filter = `fecha_registro >= '${this.toPbDate(start)}' && fecha_registro <= '${this.toPbDate(end)}'`;
      if (filterExtra) filter += ` && (${filterExtra})`;

      return await this.pbService.pb.collection(this.collectionName).getFullList({
        filter,
        expand: 'operador'
      });
    } catch (error) {
      console.error('Error fetching by date range:', error);
      return [];
    }
  }

  async getMyActionsCount(userId: string, start: Date, end: Date): Promise<number> {
    try {
      const filter = `operador_id = '${userId}' && fecha >= '${start.toISOString()}' && fecha <= '${end.toISOString()}'`;
      const result = await this.pbService.pb.collection('historial_acciones').getList(1, 1, { filter });
      return result.totalItems;
    } catch {
      return 0;
    }
  }

  /**
   * Obtiene el historial de atenciones (impresiones) de un operador específico.
   * Utiliza 'expand' para traer los datos del expediente relacionado.
   */
  async getMisAtenciones(operadorId: string): Promise<RecordModel[]> {
    try {
      const options = {
        filter: `operador_id = '${operadorId}'`
      };
      const logs = await this.pbService.pb.collection('historial_acciones').getFullList(options);

      if (logs.length === 0) return [];

      // Sort manually using our explicit fecha (Bypass PocketBase index bug on -created)
      logs.sort((a, b) => new Date(b['fecha']).getTime() - new Date(a['fecha']).getTime());

      // Deduplicate: Keep only the latest action per expediente_id (since they are sorted DESC)
      const uniqueLogs = [];
      const seenIds = new Set();
      for (const log of logs) {
        if (!seenIds.has(log['expediente_id'])) {
          uniqueLogs.push(log);
          seenIds.add(log['expediente_id']);
        }
      }

      // 2. Obtener IDs únicos de expedientes
      const ids = Array.from(seenIds).filter(id => !!id) as string[];

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

      return uniqueLogs.map(log => {
        const exp = expMap.get(log['expediente_id']);
        if (exp) {
          (log as any).expand = { expediente_id: exp };
        }
        return log;
      }).filter(log => {
        const estadoActual = (log as any).expand?.expediente_id?.estado || '';
        const logPerfil = (log as any).operador_perfil || '';

        // If an Impresor reverted an item back to EN PROCESO, hide it
        if (logPerfil === 'IMPRESOR' && estadoActual === 'EN PROCESO') return false;

        // If a Supervisor reverted an item back to IMPRESO (or it went all the way to EN PROCESO), hide it
        if (logPerfil === 'SUPERVISOR' && (estadoActual === 'IMPRESO' || estadoActual === 'EN PROCESO')) return false;

        // If an Entregador reverted an item back to VERIFICADO (or lower), hide it
        if (logPerfil === 'ENTREGADOR' && (estadoActual === 'VERIFICADO' || estadoActual === 'IMPRESO' || estadoActual === 'EN PROCESO')) return false;

        return true;
      });

    } catch (error) {
      console.error('Error fetching mis atenciones:', error);
      return [];
    }
  }
}
