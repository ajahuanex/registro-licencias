/** ============================================================
 *  MODELOS DE DATOS - Módulo OTI Notificaciones
 *  DRTC Puno - Dirección Regional de Transportes y Comunicaciones
 * ============================================================ */

/** Adjunto que se enviará junto a la notificación */
export interface Adjunto {
  url: string;
  nombreArchivo: string;
}

/** Payload completo para POST /notificacion */
export interface NotificacionPayload {
  codTipoPersona:   string;
  codTipoDocumento: string;
  nroDocumento:     string;
  asunto:           string;
  mensaje:          string;
  idCategoria:      number;
  conSelloTiempo:   boolean;
  tipoSelloTiempo:  string;
  adjuntos:         Adjunto[];
}

/** Respuesta del endpoint GET /info */
export interface InfoCasillaResponse {
  status: string;
  info: {
    success: boolean;
    message?: string;
    data?: {
      activo: boolean;
      nombreCompleto?: string;
      email?: string;
    };
    errors?: any;
  }
}

/** Estado de verificación de la casilla */
export type EstadoCasilla = 'pendiente' | 'verificando' | 'activo' | 'inactivo' | 'error';

/** Toast de feedback */
export interface Toast {
  id: number;
  tipo: 'exito' | 'error' | 'info';
  mensaje: string;
}
