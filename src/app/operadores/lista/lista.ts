import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { OperadorService } from '../../core/services/operador.service';
import { RecordModel } from 'pocketbase';
import { ModalOperador } from '../modal-operador/modal-operador';

import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-lista',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './lista.html',
  styleUrl: './lista.scss'
})
export class Lista implements OnInit {
  private operadorService = inject(OperadorService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private titleService = inject(Title);

  operadores = signal<RecordModel[]>([]);
  isLoading = signal<boolean>(true);
  
  displayedColumns: string[] = ['dni', 'nombre', 'perfil', 'email', 'acciones'];

  async ngOnInit() {
    this.titleService.setTitle('Gestión de Operadores | DRTC Puno');
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const data = await this.operadorService.getOperadores();
      this.operadores.set(data);
    } catch (e: any) {
      console.error(e);
      this.snackBar.open('Error al cargar operadores: ' + e.message, 'Cerrar', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  openModal(operador?: RecordModel) {
    const dialogRef = this.dialog.open(ModalOperador, {
      width: '500px',
      data: operador ? { ...operador } : null,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loadData(); // Reload list if changes were saved
      }
    });
  }

  async deleteOperador(id: string) {
    if (confirm('¿Está seguro de que desea eliminar este operador? Esta acción no se puede deshacer.')) {
      this.isLoading.set(true);
      try {
        await this.operadorService.deleteOperador(id);
        this.snackBar.open('Operador eliminado exitosamente.', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
        await this.loadData();
      } catch (e: any) {
        this.snackBar.open('Error al eliminar: ' + e.message, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
        this.isLoading.set(false);
      }
    }
  }
}
