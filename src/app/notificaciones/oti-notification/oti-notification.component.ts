import {
  Component, inject, signal, computed, ChangeDetectionStrategy, OnInit
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormControlStatus } from '@angular/forms';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { PocketbaseService }  from '../../core/services/pocketbase.service';
import { CasillaService }     from '../services/casilla.service';
import {
  EstadoCasilla, Toast, NotificacionPayload
} from '../models/notificacion.models';

/* ============================================================
   PLANTILLA HTML INSTITUCIONAL – constante separada
   Diseño institucional: verde DRTC #004d40, aviso 5 días,
   enlace Facilita Puno.
   ============================================================ */
function generarPlantillaHtml(asunto: string): string {
  const fecha = new Date().toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${asunto}</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f5f5f5;color:#333}
    .wrapper{max-width:650px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12)}
    .header{background:#004d40;padding:24px 32px;text-align:center}
    .header img{height:60px;margin-bottom:8px}
    .header h1{color:#fff;font-size:18px;margin:0;line-height:1.4}
    .header p{color:#b2dfdb;font-size:13px;margin:4px 0 0}
    .body{padding:28px 32px}
    .body p{line-height:1.7;font-size:15px;margin:0 0 12px}
    .asunto{font-weight:700;color:#004d40;font-size:16px;border-left:4px solid #004d40;padding-left:12px;margin:16px 0}
    .aviso{background:#fff3e0;border:1px solid #ffb300;border-radius:6px;padding:14px 18px;margin:20px 0;font-size:14px}
    .aviso strong{color:#e65100}
    .btn{display:inline-block;background:#004d40;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;margin-top:16px}
    .footer{background:#f9f9f9;border-top:1px solid #eee;padding:18px 32px;font-size:12px;color:#777;text-align:center}
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>GOBIERNO REGIONAL PUNO</h1>
    <p>Dirección Regional de Transportes y Comunicaciones</p>
  </div>
  <div class="body">
    <p>Estimado(a) Administrado(a):</p>
    <p>
      Por medio de la presente, nos comunicamos con usted a través del
      <strong>Sistema de Casilla Electrónica</strong> de la DRTC Puno, con la
      finalidad de notificarle el siguiente acto administrativo:
    </p>
    <div class="asunto">${asunto}</div>
    <p>Fecha de notificación electrónica: <strong>${fecha}</strong></p>

    <div class="aviso">
      <strong>⚠ IMPORTANTE:</strong> Conforme al Art. 24° del TUO de la Ley N.° 27444,
      usted dispone de <strong>5 días hábiles</strong> a partir de la fecha de esta
      notificación para ejercer su derecho de defensa o interponer los recursos
      administrativos que estime pertinentes.
    </div>

    <p>Para visualizar el documento adjunto y gestionar su trámite en línea, ingrese al portal:</p>
    <a class="btn" href="https://facilita.transportespuno.gob.pe" target="_blank">
      Ingresar a Facilita Puno
    </a>
    <p style="margin-top:20px;font-size:13px;color:#555">
      Si tiene alguna consulta, puede comunicarse con nosotros al correo
      <a href="mailto:informes@transportespuno.gob.pe" style="color:#004d40">
        informes@transportespuno.gob.pe
      </a>
      o llamar al teléfono (051) 351010.
    </p>
  </div>
  <div class="footer">
    © ${new Date().getFullYear()} Dirección Regional de Transportes y Comunicaciones – Puno.<br>
    Este mensaje ha sido generado automáticamente, por favor no responda a este correo.
  </div>
</div>
</body>
</html>`;
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
@Component({
  selector: 'app-oti-notification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [CasillaService],
  template: `
    <!-- ── TOASTS ── -->
    <div class="oti-toasts">
      @for (t of toasts(); track t.id) {
        <div class="toast" [class]="'toast--' + t.tipo">
          <span>{{ t.tipo === 'exito' ? '✅' : t.tipo === 'error' ? '❌' : 'ℹ️' }}</span>
          <p>{{ t.mensaje }}</p>
          <button (click)="cerrarToast(t.id)">×</button>
        </div>
      }
    </div>

    <!-- ── CONTENEDOR PRINCIPAL ── -->
    <div class="oti-wrapper">

      <!-- Cabecera institucional -->
      <header class="oti-header">
        <div class="oti-header__logo">🏛️</div>
        <div>
          <h1>Panel OTI — Notificaciones Electrónicas</h1>
          <p>Dirección Regional de Transportes y Comunicaciones Puno</p>
        </div>
      </header>

      <!-- FORMULARIO -->
      <form [formGroup]="notiForm" (ngSubmit)="enviar()" class="oti-form">

        <!-- 1. Datos del administrado -->
        <section class="oti-section">
          <h2 class="oti-section__title">
            <span class="oti-step">1</span> Datos del Administrado
          </h2>
          <div class="oti-grid-3">
            <label class="oti-field">
              <span>Tipo de Persona</span>
              <select formControlName="codTipoPersona">
                <option value="00001">Persona Natural</option>
                <option value="00002">Persona Jurídica</option>
              </select>
            </label>
            <label class="oti-field">
              <span>Tipo de Documento</span>
              <select formControlName="codTipoDocumento">
                <option value="00002">DNI</option>
                <option value="00001">RUC</option>
              </select>
            </label>
            <label class="oti-field">
              <span>Nro Documento</span>
              <div class="oti-input-btn">
                <input type="text" formControlName="nroDocumento"
                       placeholder="Ej: 40123456"
                       maxlength="11">
                <button type="button" class="btn-verificar"
                        [disabled]="notiForm.get('nroDocumento')?.invalid || estadoCasilla() === 'verificando'"
                        (click)="validarCasilla()">
                  {{ estadoCasilla() === 'verificando' ? '…' : 'Verificar' }}
                </button>
              </div>
            </label>
          </div>

          <!-- Badge de estado -->
          @if (estadoCasilla() === 'verificando') {
            <div class="oti-badge oti-badge--info">🔄 Consultando casilla electrónica…</div>
          } @else if (estadoCasilla() === 'activo') {
            <div class="oti-badge oti-badge--ok">
              ✅ Casilla activa —
              @if (nombreAdministrado()) { <strong>{{ nombreAdministrado() }}</strong> }
            </div>
          } @else if (estadoCasilla() === 'inactivo') {
            <div class="oti-badge oti-badge--warn">
              ❌ El administrado no cuenta con casilla electrónica activa.
            </div>
          } @else if (estadoCasilla() === 'error') {
            <div class="oti-badge oti-badge--error">
              ⚠️ Error al consultar la casilla. Verifique la conexión o los datos.
            </div>
          }
        </section>

        <!-- 2. Contenido de la notificación -->
        <section class="oti-section">
          <h2 class="oti-section__title">
            <span class="oti-step">2</span> Contenido de la Notificación
          </h2>
          <label class="oti-field">
            <span>Asunto de la Notificación</span>
            <input type="text" formControlName="asunto"
                   placeholder="Ej: Resolución Directoral N.° 0123-2026-GRP/DRTC-D">
            @if (notiForm.get('asunto')?.invalid && notiForm.get('asunto')?.touched) {
              <small class="oti-error">Mínimo 10 caracteres.</small>
            }
          </label>
          <div class="oti-grid-2">
            <label class="oti-field">
              <span>Categoría</span>
              <select formControlName="idCategoria">
                <option [value]="1">Autorización</option>
                <option [value]="2">Sanción</option>
                <option [value]="5">Notificación</option>
                <option [value]="6">Resoluciones</option>
              </select>
            </label>
            <label class="oti-field oti-field--checkbox">
              <input type="checkbox" formControlName="conSelloTiempo">
              <span>Incluir sello de tiempo</span>
            </label>
          </div>
        </section>

        <!-- 3. Adjunto PDF -->
        <section class="oti-section">
          <h2 class="oti-section__title">
            <span class="oti-step">3</span> Documento Adjunto (PDF)
          </h2>
          <div class="oti-upload-zone">
            <div class="oti-upload-zone__icon">📄</div>
            <p class="oti-upload-zone__label">Arrastre el PDF aquí o seleccione un archivo</p>
            <input type="file" id="pdf-input" (change)="onFileSelected($event)"
                   accept="application/pdf">
            <label for="pdf-input" class="btn-upload">Seleccionar PDF</label>
            @if (archivoNombre()) {
              <span class="oti-upload-zone__name">{{ archivoNombre() }}</span>
            }
          </div>

          <!-- Barra de progreso -->
          @if (progresoUpload() > 0 && progresoUpload() < 100) {
            <div class="oti-progress">
              <div class="oti-progress__bar" [style.width.%]="progresoUpload()"></div>
              <span>{{ progresoUpload() }}%</span>
            </div>
          }

          <div class="oti-divider">— o bien —</div>
          <label class="oti-field">
            <span>Link externo (Drive / Dropbox / OneDrive)</span>
            <input type="url" formControlName="linkExterno"
                   placeholder="https://drive.google.com/...">
          </label>
        </section>

        <!-- 4. Vista previa del mensaje -->
        <section class="oti-section">
          <h2 class="oti-section__title">
            <span class="oti-step">4</span> Vista Previa del Mensaje
          </h2>
          <div class="oti-preview">
            <iframe [srcdoc]="safePreviewHtml()" title="Vista previa del mensaje"></iframe>
          </div>
        </section>

        <!-- Botones -->
        <div class="oti-actions">
          <button type="button" class="btn-secundario" (click)="limpiarFormulario()">
            Limpiar
          </button>
          <button type="submit"
                  class="btn-primario"
                  [disabled]="!puedeEnviar()">
            @if (cargando()) {
              <span class="spinner"></span> Enviando…
            } @else {
              🚀 Firmar y Enviar Notificación
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./oti-notification.component.scss']
})
export class OtiNotificationComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private casilla = inject(CasillaService);
  private pbSvc   = inject(PocketbaseService);
  private sanitizer = inject(DomSanitizer);

  // ── Signals de estado ──
  cargando         = signal(false);
  progresoUpload   = signal(0);
  estadoCasilla    = signal<EstadoCasilla>('pendiente');
  nombreAdministrado = signal<string | null>(null);
  archivoNombre    = signal<string | null>(null);
  toasts           = signal<Toast[]>([]);
  private toastId  = 0;
  
  // Signal para forzar la reactividad del formulario
  formStatus = signal<FormControlStatus>('INVALID');
  linkExternoValue = signal<string>('');

  // ── Archivo seleccionado ──
  private fileToUpload: File | null = null;

  // ── Formulario ──
  notiForm!: FormGroup;

  // ── Computed: HTML de previsualización ──
  previewHtml = computed(() => {
    const asunto = this.notiForm?.get('asunto')?.value || 'Asunto de la Notificación';
    return generarPlantillaHtml(asunto);
  });

  safePreviewHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.previewHtml()));

  // ── Computed: habilita el botón Enviar ──
  puedeEnviar = computed(() => {
    const cargando = this.cargando();
    const formValido = this.formStatus() === 'VALID';
    const casillaActiva = this.estadoCasilla() === 'activo';
    // Usar las signals archivoNombre() y linkExternoValue() para que sea 100% reactivo
    const tieneAdjunto = !!(this.archivoNombre() || this.linkExternoValue().trim());

    return !cargando && formValido && casillaActiva && tieneAdjunto;
  });

  ngOnInit() {
    this.notiForm = this.fb.group({
      codTipoPersona:  ['00001', Validators.required],
      codTipoDocumento:['00002', Validators.required],
      nroDocumento:    ['', [Validators.required, Validators.minLength(8)]],
      asunto:          ['', [Validators.required, Validators.minLength(10)]],
      idCategoria:     [5, Validators.required],
      linkExterno:     [''],
      conSelloTiempo:  [true]
    });

    // Escuchar cambios para actualizar la reactividad del botón
    this.notiForm.statusChanges.subscribe(status => {
      this.formStatus.set(status);
    });
    this.notiForm.valueChanges.subscribe(val => {
      this.linkExternoValue.set(val?.linkExterno ?? '');
    });
    
    // Inicializar estado
    this.formStatus.set(this.notiForm.valid ? 'VALID' : 'INVALID');
    this.linkExternoValue.set(this.notiForm.value.linkExterno ?? '');
  }

  // ── Verificar casilla ──
  validarCasilla() {
    const { codTipoPersona, codTipoDocumento, nroDocumento } = this.notiForm.value;
    if (!nroDocumento || nroDocumento.length < 8) return;

    this.estadoCasilla.set('verificando');
    this.nombreAdministrado.set(null);

    console.log('[OTI] Verificando casilla (GET)...', { codTipoPersona, codTipoDocumento, nroDocumento });

    this.casilla.verificarEstado(codTipoPersona, codTipoDocumento, nroDocumento).subscribe({
      next: (res) => {
        console.log('[OTI] Respuesta detallada:', JSON.stringify(res, null, 2));
        const info = res.info;
        
        // Flexibilidad: Si status es exitoso y el API dice ok o activo
        const esExitoso = res.status === 'exitoso' || info?.success === true;
        const estaActivo = info?.data?.activo === true || info?.data?.activo === (true as any);

        if (esExitoso && estaActivo) {
          this.estadoCasilla.set('activo');
          this.nombreAdministrado.set(info.data?.nombreCompleto ?? 'Administrado Verificado');
          this.mostrarToast('exito', '✅ Casilla verificada correctamente.');
        } else {
          console.warn('[OTI] Verificación fallida. Condición no cumplida:', { esExitoso, estaActivo });
          this.estadoCasilla.set('inactivo');
          this.mostrarToast('error', info?.message ?? 'El administrado no cuenta con casilla activa.');
        }
      },
      error: (err) => {
        console.error('[OTI] Error en verificación:', err);
        this.estadoCasilla.set('error');
        this.mostrarToast('error', 'No se pudo conectar con el servicio de casillas. Verifique la red.');
      }
    });
  }

  // ── Selección de archivo ──
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.mostrarToast('error', 'Solo se permiten archivos PDF.');
      return;
    }
    this.fileToUpload = file;
    this.archivoNombre.set(file.name);
  }

  // ── Enviar notificación ──
  async enviar() {
    if (!this.puedeEnviar()) return;
    this.cargando.set(true);

    try {
      let finalUrl  = this.notiForm.value.linkExterno?.trim() ?? '';
      let fileName  = 'documento_adjunto.pdf';

      console.log('[OTI] === INICIANDO PREPARACIÓN DEL ENVÍO ===');
      console.log('[OTI] Datos fijos verificados previamente en el GET:', {
        codTipoPersona: this.notiForm.value.codTipoPersona,
        codTipoDocumento: this.notiForm.value.codTipoDocumento,
        nroDocumento: this.notiForm.value.nroDocumento
      });

      // 1. Prioridad: Subir PDF a PocketBase si hay archivo seleccionado (AQUÍ ES DONDE DA EL 404 SI NO EXISTE LA COLECCIÓN)
      if (this.fileToUpload) {
        console.log('[OTI] Intentando subir archivo local a la colección "archivos_notificaciones" en PocketBase...');
        finalUrl = await this.subirArchivoPb(this.fileToUpload);
        fileName = this.fileToUpload.name;
        console.log('[OTI] Archivo subido con éxito:', finalUrl);
      } else if (finalUrl) {
        console.log('[OTI] Usando link externo proporcionado:', finalUrl);
        // Extraer nombre del link y garantizar extensión .pdf
        if (finalUrl.includes('/')) {
          let extracted = finalUrl.split('/').pop() || fileName;
          if (!extracted.toLowerCase().endsWith('.pdf')) {
            extracted += '.pdf';
          }
          fileName = extracted;
        }
      }

      if (!finalUrl) {
        this.mostrarToast('error', 'Debe adjuntar un PDF o ingresar un link externo.');
        this.cargando.set(false);
        return;
      }

      // 2. Construir payload
      const payload: NotificacionPayload = {
        codTipoPersona:   this.notiForm.value.codTipoPersona,
        codTipoDocumento: this.notiForm.value.codTipoDocumento,
        nroDocumento:     this.notiForm.value.nroDocumento,
        asunto:           this.notiForm.value.asunto,
        idCategoria:      Number(this.notiForm.value.idCategoria),
        conSelloTiempo:   !!this.notiForm.value.conSelloTiempo,
        tipoSelloTiempo:  'PROPIO',
        mensaje:          generarPlantillaHtml(this.notiForm.value.asunto),
        adjuntos:         [{ url: finalUrl, nombreArchivo: fileName }]
      };

      console.log('[OTI] Payload FINAL que se enviará a Node-RED (/notificacion):', payload);

      // 3. Enviar al API de casillas
      this.casilla.enviarNotificacion(payload).subscribe({
        next: async (res: any) => {
          // El API devuelve { status: 'exitoso', info: { success: true } }
          const esExitoso = res.status === 'exitoso' || res.info?.success === true || res.success === true;
          
          if (esExitoso) {
            // 4. Registrar historial en PocketBase (Try-Catch independiente)
            try {
              await this.registrarHistorial(finalUrl);
            } catch (historialErr) {
              console.warn('[OTI] La notificación se envió a Node-RED, pero no se pudo guardar el historial comercial en PocketBase (Falta crear la tabla "historial_notificaciones").', historialErr);
            }
            
            this.mostrarToast('exito', '¡Notificación enviada exitosamente!');
            this.limpiarFormulario();
          } else {
            const msjError = res.info?.message || res.message || 'El servidor rechazó la notificación.';
            this.mostrarToast('error', msjError);
          }
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('[OTI] Error envio a Node-RED (Detalles completos):', err);
          if (err.error) {
            console.error('[OTI] Cuerpo del error (Body):', err.error);
          }
          this.mostrarToast('error', 'Error al enviar la notificación. Revise la consola.');
          this.cargando.set(false);
        }
      });

    } catch (error) {
      console.error('[OTI] Error general (Probablemente PocketBase falló porque no existe la colección "archivos_notificaciones"):', error);
      this.mostrarToast('error', 'Ocurrió un error inesperado al gestionar los archivos. Revise la consola.');
      this.cargando.set(false);
    }
  }

  // ── Helpers ──

  /** Sube el PDF a PocketBase y devuelve la URL pública. */
  private async subirArchivoPb(file: File): Promise<string> {
    this.progresoUpload.set(10);
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('nroDocumento', this.notiForm.value.nroDocumento);

    const record = await this.pbSvc.pb.collection('archivos_notificaciones').create(formData);
    this.progresoUpload.set(100);
    // Usar getFileUrl para construcción correcta de la URL
    return this.pbSvc.pb.getFileUrl(record, record['archivo']);
  }

  /** Registra el envío en la colección de historial. */
  private async registrarHistorial(urlAdjunto: string) {
    await this.pbSvc.pb.collection('historial_notificaciones').create({
      nroDocumento:     this.notiForm.value.nroDocumento,
      codTipoPersona:   this.notiForm.value.codTipoPersona,
      codTipoDocumento: this.notiForm.value.codTipoDocumento,
      asunto:           this.notiForm.value.asunto,
      idCategoria:      this.notiForm.value.idCategoria,
      adjunto:          urlAdjunto,
      usuario_oti:      this.pbSvc.pb.authStore.model?.['id'] ?? null
    });
  }

  /** Muestra un toast y lo elimina automáticamente tras 5 s. */
  mostrarToast(tipo: Toast['tipo'], mensaje: string) {
    const id = ++this.toastId;
    this.toasts.update(list => [...list, { id, tipo, mensaje }]);
    setTimeout(() => this.cerrarToast(id), 5000);
  }

  /** Cierra un toast por su ID. */
  cerrarToast(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  /** Reinicia todos los estados del formulario. */
  limpiarFormulario() {
    this.notiForm.reset({
      codTipoPersona: '00001',
      codTipoDocumento: '00002',
      idCategoria: 5,
      conSelloTiempo: true
    });
    this.fileToUpload = null;
    this.archivoNombre.set(null);
    this.progresoUpload.set(0);
    this.estadoCasilla.set('pendiente');
    this.nombreAdministrado.set(null);
  }
}
