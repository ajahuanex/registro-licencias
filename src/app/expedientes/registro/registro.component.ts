import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpedienteService, ExpedienteCreate } from '../../core/services/expediente.service';
import { AuthService } from '../../core/services/auth.service';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss'
})
export class RegistroComponent {
  private fb = inject(FormBuilder);
  private expedienteService = inject(ExpedienteService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  isLoading = signal<boolean>(false);

  // Requirement: Reactive form group initialization
  form = this.fb.group({
    dni_solicitante: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    apellidos_nombres: ['', [Validators.required, Validators.minLength(3)]],
    tramite: ['Duplicado', Validators.required],
    estado: ['EN PROCESO', Validators.required],
    categoria: ['AI', Validators.required],
    lugar_entrega: ['Puno', Validators.required],
    observaciones: ['']
  });

  tramites = ['Duplicado', 'Revalidación'];
  estados = ['EN PROCESO', 'VERIFICADO', 'ATENDIDO', 'ENTREGADO', 'OBSERVADO', 'RECHAZADO', 'ANULADO'];
  categorias = ['AI', 'AIIA', 'AIIB', 'AIIIC'];
  lugares = ['Puno', 'Juliaca'];

  constructor() {
    this.form.get('estado')?.valueChanges.subscribe(estado => {
      const obsControl = this.form.get('observaciones');
      if (estado === 'OBSERVADO') {
        obsControl?.setValidators([Validators.required, Validators.minLength(5)]);
      } else {
        obsControl?.clearValidators();
      }
      obsControl?.updateValueAndValidity();
    });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) throw new Error("No hay usuario activo.");

      const formValue = this.form.value;

      // Extract raw values ensuring types
      const payload: ExpedienteCreate = {
        operador: currentUser.id,
        dni_solicitante: formValue.dni_solicitante!.trim(),
        apellidos_nombres: formValue.apellidos_nombres!.trim().toUpperCase(),
        tramite: formValue.tramite!,
        estado: formValue.estado!,
        categoria: formValue.categoria!,
        lugar_entrega: formValue.lugar_entrega!,
        observaciones: formValue.observaciones || '',
        fecha_registro: new Date().toISOString()
      };

      await this.expedienteService.registerExpediente(payload);
      
      this.snackBar.open('¡Expediente registrado exitosamente!', 'Cerrar', {
        duration: 4000,
        panelClass: ['success-snackbar']
      });

      // Clear the form and set default selections back
      this.form.reset({
        tramite: 'Duplicado',
        estado: 'EN PROCESO',
        categoria: 'AI',
        lugar_entrega: 'Puno',
        observaciones: ''
      });

    } catch (error: any) {
      this.snackBar.open(error.message || 'Error al guardar el expediente', 'Cerrar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading.set(false);
    }
  }
}
