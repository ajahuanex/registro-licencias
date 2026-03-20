import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpedienteService } from '../core/services/expediente.service';
import { AuthService } from '../core/services/auth.service';
import { RecordModel } from 'pocketbase';

import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-entregas',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatCardModule,
    MatButtonModule, MatIconModule,    MatTooltipModule,
    MatSelectModule,
    MatSnackBarModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './entregas.component.html',
  styleUrl: './entregas.component.scss'
})
export class EntregasComponent implements OnInit {
  private expedienteService = inject(ExpedienteService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  lugares = ['Puno', 'Juliaca'];
  selectedLugar = signal('Puno');
  records = signal<RecordModel[]>([]);
  isLoading = signal(true);
  
  currentUserSede = signal<string>('');

  searchTerm = signal('');
  filteredRecords = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.records();
    return this.records().filter(r => 
      (r['dni_solicitante'] || '').includes(term) ||
      (r['apellidos_nombres']?.toLowerCase() || '').includes(term) ||
      (r['tramite']?.toLowerCase() || '').includes(term) ||
      (r['categoria']?.toLowerCase() || '').includes(term)
    );
  });

  displayedColumns: string[] = ['dni_solicitante', 'apellidos_nombres', 'tramite', 'categoria', 'fecha', 'acciones'];

  async ngOnInit() {
    const user = this.authService.currentUser();
    if (user && user['sede']) {
      // Parse potentially array values (from PB select) to string
      const parsedSede = String(user['sede']).trim();
      this.selectedLugar.set(parsedSede);
      this.currentUserSede.set(parsedSede);
    }
    await this.loadData();
  }

  canDeliver() {
    // Admins OTI and Admin can always deliver, or Entregador assigned to this Sede
    const user = this.authService.currentUser();
    if (!user) return false;
    if (user['perfil'] === 'OTI' || user['perfil'] === 'ADMINISTRADOR') return true;
    
    // Compare parsed strings cleanly
    const uSede = String(this.currentUserSede()).toLowerCase().trim();
    const sLugar = String(this.selectedLugar()).toLowerCase().trim();
    return uSede === sLugar;
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const data = await this.expedienteService.getPendingDeliveries(this.selectedLugar());
      this.records.set(data);
    } catch (e: any) {
      this.snackBar.open('Error cargando entregas pendientes: ' + e.message, 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  onLugarChange() {
    this.loadData();
  }

  async marcarEntregado(id: string) {
    if (!confirm('¿Confirmar la entrega de esta licencia al ciudadano?')) return;
    
    this.isLoading.set(true);
    try {
      await this.expedienteService.updateExpediente(id, { estado: 'ENTREGADO' }, 'ENTREGA_LICENCIA');
      this.snackBar.open('¡Licencia marcada como entregada!', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
      await this.loadData();
    } catch (e: any) {
      this.snackBar.open('Error confirmando la entrega: ' + e.message, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
      this.isLoading.set(false);
    }
  }
}
