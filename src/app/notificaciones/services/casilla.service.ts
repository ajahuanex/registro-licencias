import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { InfoCasillaResponse, NotificacionPayload } from '../models/notificacion.models';

/** ============================================================
 *  CasillaService
 *  Encapsula las llamadas al API de Casillas Electrónicas
 *  (Node-RED) de la DRTC Puno.
 * ============================================================ */
@Injectable({ providedIn: 'root' })
export class CasillaService {
  private http = inject(HttpClient);

  private readonly baseUrl = 'http://casillas.transportespuno.gob.pe:1880/api/v2';
  private readonly apiKey  = 'topSecret123';

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Paso 1 – Verificar existencia y estado de la casilla del administrado.
   * Ahora que Node-RED usa msg.req.query, usamos un GET estándar con HttpParams.
   */
  verificarEstado(tipoPers: string, tipoDoc: string, numDoc: string) {
    const params = new HttpParams()
      .set('codTipoPersona', tipoPers)
      .set('codTipoDocumento', tipoDoc)
      .set('nroDocumento', numDoc);

    return this.http.get<InfoCasillaResponse>(`${this.baseUrl}/info`, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * Paso 2 – Enviar la notificación electrónica.
   * POST /notificacion   Body: NotificacionPayload
   */
  enviarNotificacion(data: NotificacionPayload) {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.baseUrl}/notificacion`,
      data,
      { headers: this.getHeaders() }
    );
  }
}
