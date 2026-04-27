import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { ExpedienteService } from '../../core/services/expediente.service';
import { RecordModel } from 'pocketbase';
import { ExpedienteTrackerComponent } from '../expediente-tracker/expediente-tracker.component';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-consulta-expediente',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule, 
    MatInputModule, MatFormFieldModule, MatCardModule,
    MatDividerModule, ExpedienteTrackerComponent, RouterModule
  ],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.5s cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div class="public-container">
      <!-- Decorative Elements -->
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      
      <a mat-icon-button class="login-subtle-btn" routerLink="/login" title="Acceso Administrativo">
        <mat-icon>admin_panel_settings</mat-icon>
      </a>
      
      <div class="content">
        <header class="header" [@fadeInUp]>
          <div class="logo-wrapper">
            <img src="logo-drtcp.svg" alt="DRTC Puno" class="logo">
          </div>
          <h1>Seguimiento de Trámites <small style="font-size: 0.8rem; vertical-align: middle; opacity: 0.5;">v2.8.0</small></h1>
        </header>

        <main class="main-card glass" [@fadeInUp]>
          @if (!selectedExp()) {
            <div class="search-section">
              <div class="welcome-text">
                <h2>¿Cuál es el estado de tu trámite?</h2>
                <p>Ingresa tu número de DNI para rastrear tu expediente en tiempo real.</p>
              </div>

              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Número de DNI</mat-label>
                <input matInput [(ngModel)]="dni" placeholder="8 dígitos" maxlength="8" (keyup.enter)="buscar()">
                <mat-icon matPrefix>badge</mat-icon>
                @if (dni()) {
                  <button mat-icon-button matSuffix (click)="dni.set(''); buscado.set(false); expedientes.set([])">
                    <mat-icon>close</mat-icon>
                  </button>
                }
              </mat-form-field>
              
              <button mat-flat-button color="primary" class="search-btn" [disabled]="dni().length !== 8 || buscando()" (click)="buscar()">
                <mat-icon>{{ buscando() ? 'hourglass_empty' : 'search' }}</mat-icon>
                {{ buscando() ? 'Buscando...' : 'Consultar Ahora' }}
              </button>
            </div>
          }

          @if (buscado() && expedientes().length === 0 && !selectedExp()) {
            <div class="no-results" [@fadeInUp]>
              <mat-icon>search_off</mat-icon>
              <h3>No se encontraron registros</h3>
              <p>Asegúrate de que el DNI sea el correcto. Los expedientes se reflejan en el sistema minutos después de su registro.</p>
            </div>
          }

          @if (expedientes().length > 0 && !selectedExp()) {
            <div class="results-list" [@fadeInUp]>
              <div class="results-header">
                <h3><mat-icon>list_alt</mat-icon> Trámites encontrados para {{ dni() }}</h3>
                <span class="count-badge">{{ expedientes().length }} resultados</span>
              </div>
              <div class="exp-cards">
                @for (exp of expedientes(); track exp.id) {
                  <mat-card class="exp-card" (click)="selectExp(exp)">
                    <div class="card-edge" [ngClass]="exp['estado']"></div>
                    <mat-card-content>
                      <div class="exp-top">
                        <span class="exp-date">{{ exp['fecha_registro'] | date:'dd MMM yyyy' }}</span>
                        <span class="exp-status-mini" [ngClass]="exp['estado']">{{ exp['estado'] }}</span>
                      </div>
                      <h4 class="exp-title">{{ exp['tramite'] }}</h4>
                      <div class="exp-meta">
                        <span><mat-icon>category</mat-icon> {{ exp['categoria'] }}</span>
                        <span><mat-icon>location_on</mat-icon> {{ exp['lugar_entrega'] }}</span>
                      </div>
                      <div class="card-action">
                        Ver Detalles <mat-icon>chevron_right</mat-icon>
                      </div>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            </div>
          }

          @if (selectedExp()) {
            <div class="tracking-id">
              ID: {{ selectedExp()?.id }} 
              @if (history().length > 0) {
                <span style="color: #10b981; font-size: 0.7rem; margin-left: 8px;">● Historial OK</span>
              }
            </div>
            <div class="tracker-section" [@fadeInUp]>
              <div class="tracker-header">
                <button mat-icon-button (click)="selectedExp.set(null); directId.set(null)" class="back-btn">
                  <mat-icon>arrow_back</mat-icon>
                </button>
                <div class="title">
                   <h3>Estado de mi Trámite</h3>
                   <span class="id-text">ID: {{ selectedExp()!.id }}</span>
                </div>
                <div class="spacer"></div>
              </div>
              
              <!-- THE SNAKE PATH (Roadmap Visual) -->
              <div class="snake-path-container">
                <div class="path-line"></div>
                <div class="steps">
                  <div class="step" [class.active]="isPassed('EN PROCESO')" [class.current]="selectedExp()!['estado'] === 'EN PROCESO'">
                    <div class="node"><mat-icon>app_registration</mat-icon></div>
                    <span class="label">REGISTRADO</span>
                    @if (isPassed('EN PROCESO')) {
                      <span class="step-date">{{ getStageDate('REGISTRADO') | date:'dd/MM/yy HH:mm' }}</span>
                    }
                  </div>
                  <div class="step" [class.active]="isPassed('IMPRESO')" [class.current]="isCurrent('IMPRESO')">
                    <div class="node"><mat-icon>print</mat-icon></div>
                    <span class="label">IMPRESO</span>
                    @if (isPassed('IMPRESO')) {
                      <span class="step-date">{{ getStageDate('IMPRESO') | date:'dd/MM/yy HH:mm' }}</span>
                    }
                  </div>
                  <div class="step" [class.active]="isPassed('VERIFICADO')" [class.current]="isCurrent('VERIFICADO')">
                    <div class="node"><mat-icon>verified</mat-icon></div>
                    <span class="label">VERIFICADO</span>
                    @if (isPassed('VERIFICADO')) {
                      <span class="step-date">{{ getStageDate('VERIFICADO') | date:'dd/MM/yy HH:mm' }}</span>
                    }
                  </div>
                  <div class="step" [class.active]="isPassed('RECOJO')" [class.current]="isCurrent('RECOJO')">
                    <div class="node"><mat-icon>hail</mat-icon></div>
                    <span class="label">LISTO PARA RECOJO</span>
                    <span class="step-date" *ngIf="isPassed('RECOJO')">{{ getStageDate('RECOJO') | date:'dd/MM/yy HH:mm' }}</span>
                  </div>
                  <div class="step" [class.is-delivery]="true" [class.active]="isPassed('ENTREGADO')" [class.current]="isCurrent('ENTREGADO')">
                    <div class="node"><mat-icon>task_alt</mat-icon></div>
                    <span class="label">ENTREGADO</span>
                    @if (isPassed('ENTREGADO')) {
                      <span class="step-date">{{ getStageDate('ENTREGADO') | date:'dd/MM/yy HH:mm' }}</span>
                    }
                  </div>
                </div>
              </div>

              @if (selectedExp(); as exp) {
                <div class="exp-summary-box shadow-sm">
                  <div class="info-grid">
                    <div class="info-item">
                      <label>Titular</label>
                      <p>{{ exp['apellidos_nombres'] }}</p>
                    </div>
                    <div class="info-item">
                      <label>Trámite</label>
                      <p>{{ exp['tramite'] }}</p>
                    </div>
                    <div class="info-item">
                      <label>Categoría</label>
                      <p>{{ exp['categoria'] }}</p>
                    </div>
                    <div class="info-item">
                      <label>Entrega en</label>
                      <p>{{ exp['lugar_entrega'] }}</p>
                    </div>
                  </div>
                </div>
              }

              @if (authService.isLoggedIn()) {
                <div class="timeline-wrapper">
                  <h4 class="section-title">Historial Detallado (Solo Operadores)</h4>
                  <app-expediente-tracker [expedienteId]="selectedExp()!.id"></app-expediente-tracker>
                </div>
              }

              @if (!authService.isLoggedIn()) {
                <div class="public-notice">
                  <mat-icon>info</mat-icon>
                  <p>Para ver los detalles técnicos de cada etapa, por favor consulte con un operador en ventanilla.</p>
                </div>
              }
            </div>
          }
        </main>

        <footer class="footer" [@fadeInUp]>
          <p>© 2026 Dirección Regional de Transportes y Comunicaciones - Puno</p>
          <div class="footer-links">
             <a href="#">Términos y Condiciones</a>
             <span>•</span>
             <a href="#">Ayuda</a>
          </div>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .public-container {
      min-height: 100vh;
      position: relative;
      background: #f8fafc;
      display: flex;
      justify-content: center;
      padding: 3rem 1rem;
      font-family: 'Outfit', 'Inter', sans-serif;
      overflow-x: hidden;
      color: #1e293b;
    }
    
    /* Decoration */
    .blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      z-index: 0;
      opacity: 0.5;
    }
    .blob-1 { top: -100px; right: -100px; width: 400px; height: 400px; background: rgba(37, 99, 235, 0.1); }
    .blob-2 { bottom: -100px; left: -100px; width: 400px; height: 400px; background: rgba(139, 92, 246, 0.1); }

    .login-subtle-btn {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      color: #94a3b8;
      z-index: 20;
      opacity: 0.6;
      transition: opacity 0.3s;
    }
    .login-subtle-btn:hover { opacity: 1; color: #2563eb; }

    .content { width: 100%; max-width: 900px; z-index: 10; }

    .header { text-align: center; margin-bottom: 3rem; }
    .logo-wrapper { 
      background: white; 
      padding: 1.5rem; 
      border-radius: 20px; 
      display: inline-block; 
      margin-bottom: 1.5rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
    }
    .logo { height: 70px; display: block; }
    .header h1 { font-size: 2.2rem; font-weight: 800; color: #1e3a8a; margin: 0; letter-spacing: -0.5px; }
    .header p { color: #64748b; font-size: 1rem; margin-top: 0.25rem; font-weight: 500; }

    .main-card { position: relative; }
    .glass {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: 32px;
      padding: 3rem;
      box-shadow: 0 20px 50px rgba(0,0,0,0.04);
    }

    .welcome-text { text-align: center; margin-bottom: 2.5rem; }
    .welcome-text h2 { font-size: 1.6rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }
    .welcome-text p { color: #64748b; font-size: 1rem; }

    .search-section {
      max-width: 600px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .search-field { width: 100%; }
    ::ng-deep .search-field .mat-mdc-text-field-wrapper { border-radius: 16px !important; background: white !important; }
    
    .search-btn {
      height: 60px;
      border-radius: 16px;
      font-size: 1.1rem;
      font-weight: 700;
      background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%) !important;
      box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25);
      transition: all 0.3s;
    }
    .search-btn:hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(37, 99, 235, 0.35); }

    .results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .results-header h3 { margin: 0; display: flex; align-items: center; gap: 8px; color: #334155; }
    .count-badge { background: #e2e8f0; color: #475569; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }

    .exp-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem; }
    .exp-card {
      border: none !important;
      border-radius: 20px !important;
      background: white !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.03) !important;
      transition: all 0.3s;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    .exp-card:hover { transform: translateY(-6px); box-shadow: 0 15px 35px rgba(0,0,0,0.08) !important; }
    .card-edge { position: absolute; top: 0; left: 0; width: 6px; height: 100%; }
    .card-edge.EN.PROCESO { background: #3b82f6; }
    .card-edge.IMPRESO { background: #8b5cf6; }
    .card-edge.VERIFICADO { background: #f59e0b; }
    .card-edge.ENTREGADO, .card-edge.ATENDIDO { background: #10b981; }
    .card-edge.OBSERVADO { background: #ef4444; }

    .exp-top { display: flex; justify-content: space-between; margin-bottom: 1rem; }
    .exp-date { font-size: 0.75rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
    .exp-status-mini { font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; }
    .exp-status-mini.EN.PROCESO { background: #eff6ff; color: #2563eb; }
    .exp-status-mini.IMPRESO { background: #f5f3ff; color: #7c3aed; }
    .exp-status-mini.ENTREGADO { background: #ecfdf5; color: #059669; }

    .exp-title { font-size: 1.15rem; font-weight: 700; color: #1e293b; margin: 0 0 0.75rem 0; line-height: 1.3; }
    .exp-meta { display: flex; flex-direction: column; gap: 6px; color: #64748b; font-size: 0.85rem; margin-bottom: 1.5rem; }
    .exp-meta span { display: flex; align-items: center; gap: 6px; }
    .exp-meta mat-icon { font-size: 16px; width: 16px; height: 16px; color: #cbd5e1; }

    .card-action { display: flex; align-items: center; justify-content: flex-end; color: #2563eb; font-weight: 700; font-size: 0.85rem; border-top: 1px solid #f1f5f9; padding-top: 1rem; }

    /* RoadMap / Snake Path */
    .snake-path-container {
      margin: 3rem 0;
      position: relative;
      padding: 0 20px;
    }
    .path-line {
      position: absolute;
      top: 24px; left: 60px; right: 60px;
      height: 4px;
      background: #e2e8f0;
      z-index: 1;
    }
    .steps {
      display: flex;
      justify-content: space-between;
      position: relative;
      z-index: 2;
    }
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      flex: 1;
    }
    .node {
      width: 52px; height: 52px;
      border-radius: 50%;
      background: white;
      border: 4px solid #e2e8f0;
      display: flex; align-items: center; justify-content: center;
      color: #cbd5e1;
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .step.active .node { border-color: #3b82f6; color: #3b82f6; }
    .step.current .node { 
      background: #3b82f6; 
      border-color: #3b82f6; 
      color: white; 
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
      transform: scale(1.15);
    }
    .step.current.is-delivery .node {
      background: #10b981 !important;
      border-color: #10b981 !important;
      color: white !important;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.4) !important;
    }
    .node mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-align: center; }
    .step.active .label { color: #475569; }
    .step.current .label { color: #1e3a8a; }
    .step-date { font-size: 0.65rem; color: #94a3b8; font-weight: 600; margin-top: -4px; }
    .step.active .step-date { color: #64748b; }

    .exp-summary-box {
      background: #f8fafc;
      border-radius: 20px;
      padding: 2rem;
      margin-bottom: 3rem;
      border: 1px solid #e2e8f0;
    }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; }
    .info-item label { display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
    .info-item p { margin: 0; font-size: 1rem; font-weight: 700; color: #1e293b; }

    .tracker-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; }
    .back-btn { background: #f1f5f9 !important; color: #475569 !important; }
    .tracker-header .title h3 { margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a; }
    .id-text { font-size: 0.75rem; color: #94a3b8; font-family: monospace; }
    
    .timeline-wrapper { margin-top: 2rem; }
    .section-title { font-size: 1rem; font-weight: 800; color: #334155; margin-bottom: 1.5rem; border-left: 4px solid #3b82f6; padding-left: 12px; }

    .public-notice {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 1.5rem;
      background: #f1f5f9;
      border-radius: 16px;
      margin-top: 1rem;
      color: #64748b;
      mat-icon { color: #3b82f6; }
      p { margin: 0; font-size: 0.85rem; font-weight: 500; }
    }

    .footer { text-align: center; margin-top: 4rem; padding-bottom: 2rem; color: #94a3b8; }
    .footer p { margin-bottom: 0.5rem; font-size: 0.9rem; }
    .footer-links { display: flex; justify-content: center; gap: 1rem; font-size: 0.85rem; font-weight: 600; }
    .footer-links a { color: #64748b; text-decoration: none; }
    .footer-links a:hover { color: #2563eb; }

    .no-results { text-align: center; padding: 4rem 2rem; color: #94a3b8; }
    .no-results mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 1.5rem; opacity: 0.2; }

    @media (max-width: 600px) {
      .public-container { padding: 1rem 0.5rem; }
      .glass { padding: 1.5rem 1rem; border-radius: 20px; }
      .header h1 { font-size: 1.6rem; }
      .logo-wrapper { padding: 0.75rem; margin-bottom: 1rem; }
      .logo { height: 50px; }
      .header p { display: none; }
      
      .snake-path-container { margin: 1.5rem 0; padding: 0 10px; }
      .path-line { 
        top: 30px; bottom: 30px; left: 32px; 
        width: 3px; height: auto; right: auto;
      }
      .steps { flex-direction: column; gap: 1.5rem; align-items: flex-start; }
      .step { 
        flex-direction: row; 
        align-items: center; 
        text-align: left;
        gap: 1rem;
        width: 100%;
      }
      .node { width: 44px; height: 44px; flex-shrink: 0; }
      .label { font-size: 0.8rem; text-align: left; }
      .step-date { margin-top: 2px; }
      
      .exp-summary-box { padding: 1.25rem; margin-bottom: 2rem; }
      .info-grid { grid-template-columns: 1fr; gap: 1rem; }
      
      .tracker-header { gap: 1rem; }
      .tracker-header .title h3 { font-size: 1.2rem; }
    }
  `]
})
export class ConsultaExpedienteComponent implements OnInit {
  dni = signal('');
  buscando = signal(false);
  buscado = signal(false);
  expedientes = signal<RecordModel[]>([]);
  selectedExp = signal<RecordModel | null>(null);
  directId = signal<string | null>(null);
  history = signal<RecordModel[]>([]);

  private expedienteService = inject(ExpedienteService);
  public authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.directId.set(id);
      await this.cargarDirecto(id);
    }
  }

  isPassed(step: string): boolean {
    const current = this.selectedExp()?.['estado'] || '';
    const states = ['EN PROCESO', 'IMPRESO', 'VERIFICADO', 'RECOJO', 'ENTREGADO', 'ATENDIDO'];
    const targetIdx = states.indexOf(step);
    const currentIdx = states.indexOf(current);

    // 4-hour logic for RECOJO
    if (step === 'RECOJO') {
      const verificadoDate = this.getStageDate('VERIFICADO');
      if (verificadoDate) {
        const diff = Date.now() - new Date(verificadoDate).getTime();
        const fourHoursInMs = 4 * 60 * 60 * 1000;
        if (diff >= fourHoursInMs) return true;
      }
      return currentIdx > states.indexOf('VERIFICADO'); // If already passed RECOJO/ENTREGADO
    }
    
    // Handle ATENDIDO being equivalent/after ENTREGADO
    if (current === 'ATENDIDO' && step === 'ENTREGADO') return true;
    
    return currentIdx >= targetIdx;
  }
  
  isCurrent(step: string): boolean {
    const exp = this.selectedExp();
    if (!exp) return false;
    const status = (exp['estado'] || '').toUpperCase();
    
    if (status === 'VERIFICADO') {
       const passedRecojo = this.isPassed('RECOJO');
       if (step === 'RECOJO') return passedRecojo;
       if (step === 'VERIFICADO') return !passedRecojo;
    }
    
    if (step === 'ENTREGADO') return status === 'ENTREGADO' || status === 'ATENDIDO';
    if (step === 'REGISTRADO') return status === 'EN PROCESO';
    
    return status === step.toUpperCase();
  }

  getStageDate(step: string): string | null {
    if (step === 'REGISTRADO') return this.selectedExp()?.['fecha_registro'] || null;
    if (step === 'RECOJO') {
       const verif = this.getStageDate('VERIFICADO');
       if (!verif) return null;
       const date = new Date(verif);
       date.setHours(date.getHours() + 4);
       return date.toISOString();
    }
    
    // Find in history - Order: most recent first
    const hist = [...this.history()].sort((a,b) => new Date(b['created'] || b['fecha']).getTime() - new Date(a['created'] || a['fecha']).getTime());
    
    const event = hist.find(h => {
       const det = (h['detalles'] || '').toUpperCase();
       const stNew = (h['estado_nuevo'] || '').toUpperCase();
       const acc = (h['accion'] || '').toUpperCase();
       
       if (step === 'IMPRESO') return stNew === 'IMPRESO' || acc === 'IMPRESIÓN' || det.includes('IMPRIMIÓ') || det.includes('PASÓ A IMPRESO');
       if (step === 'VERIFICADO') return stNew === 'VERIFICADO' || acc === 'VERIFICACIÓN' || det.includes('VERIFICÓ') || det.includes('PASÓ A VERIFICADO');
       if (step === 'ENTREGADO') return stNew === 'ENTREGADO' || stNew === 'ATENDIDO' || acc === 'ENTREGA' || acc === 'ATENCIÓN' || det.includes('LICENCIA ENTREGADA') || det.includes('ENTREGÓ LA LICENCIA');
       return false;
    });
    
    if (event) return event['fecha'] || event['created'];

    // FALLBACKS: If history is empty/missing, try fields from the record itself
    const exp = this.selectedExp();
    if (!exp) return null;
    const currentStatus = (exp['estado'] || '').toUpperCase();
    
    if (step === 'IMPRESO' && this.isPassed('IMPRESO')) {
       return exp['updated'] || exp['fecha_registro'];
    }
    if (step === 'VERIFICADO' && this.isPassed('VERIFICADO')) {
       return exp['updated'] || exp['fecha_registro'];
    }
    if (step === 'ENTREGADO' && this.isPassed('ENTREGADO')) {
       return exp['fecha_entrega'] || exp['updated'] || exp['fecha_registro'];
    }

    return null;
  }

  async cargarDirecto(id: string) {
    this.buscando.set(true);
    try {
      const exp = await this.expedienteService.getExpedientePublic(id);
      this.selectedExp.set(exp);
      const hist = await this.expedienteService.getHistoryByExpediente(exp.id);
      this.history.set(hist);
    } catch (e) {
      console.error('Error loading direct:', e);
    } finally {
      this.buscando.set(false);
    }
  }

  async buscar() {
    if (this.dni().length !== 8) return;
    
    this.buscando.set(true);
    this.buscado.set(true);
    this.selectedExp.set(null);
    this.directId.set(null);
    this.history.set([]);
    
    try {
      const data = await this.expedienteService.searchByDniPublic(this.dni());
      this.expedientes.set(data);
    } catch (e) {
      console.error('Error searching:', e);
      this.expedientes.set([]);
    } finally {
      this.buscando.set(false);
    }
  }

  async selectExp(exp: RecordModel) {
    this.selectedExp.set(exp);
    this.buscando.set(true);
    try {
       const hist = await this.expedienteService.getHistoryByExpediente(exp.id);
       this.history.set(hist);
    } catch (e) {
       console.error('Error fetching history:', e);
    } finally {
       this.buscando.set(false);
    }
    
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }
}
