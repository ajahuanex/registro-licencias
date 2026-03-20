import { Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { RecordModel } from 'pocketbase';
import { OperadorService, OperadorData } from '../../core/services/operador.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const passwordConfirm = control.get('passwordConfirm')?.value;
  if (password || passwordConfirm) {
    return password !== passwordConfirm ? { mustMatch: true } : null;
  }
  return null;
};

@Component({
  selector: 'app-modal-operador',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './modal-operador.html',
  styleUrl: './modal-operador.scss'
})
export class ModalOperador {
  private fb = inject(FormBuilder);
  private operadorService = inject(OperadorService);
  private snackBar = inject(MatSnackBar);
  dialogRef = inject(MatDialogRef<ModalOperador>);

  isEditMode = false;
  isLoading = signal<boolean>(false);
  hidePassword = signal<boolean>(true);

  perfiles = ['OTI', 'ADMINISTRADOR', 'SUPERVISOR', 'REGISTRADOR', 'ENTREGADOR'];

  form = this.fb.group({
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.email]],
    perfil: ['REGISTRADOR', Validators.required],
    sede: [''],
    password: ['', [Validators.minLength(8)]],
    passwordConfirm: ['']
  }, { validators: passwordMatchValidator });

  constructor(@Inject(MAT_DIALOG_DATA) public data: RecordModel | null) {
    if (data) {
      this.isEditMode = true;
      this.form.patchValue({
        dni: data['dni'],
        nombre: data['nombre'],
        email: data['email'],
        perfil: data['perfil'] || 'REGISTRADOR',
        sede: data['sede'] || ''
      });
      // In edit mode, password is not required.
    } else {
      // In create mode, password is required.
      this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
      this.form.controls.passwordConfirm.setValidators([Validators.required]);
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    try {
      const val = this.form.getRawValue();

      // Auto-generar correo si no fue ingresado para satisfacer la validación de Auth de Pocketbase
      let payloadEmail = val.email;
      if (!payloadEmail || payloadEmail.trim() === '') {
        payloadEmail = `${val.dni}@drtc.gob.pe`;
      }

      const payload: Partial<OperadorData> = {
        dni: val.dni!,
        nombre: val.nombre!,
        email: payloadEmail, // Use the potentially auto-generated email
        perfil: val.perfil!
      };

      if (val.perfil === 'ENTREGADOR' && val.sede) {
        payload.sede = val.sede;
      } else {
        payload.sede = '';
      }

      if (val.password) {
        payload.password = val.password;
        payload.passwordConfirm = val.passwordConfirm!;
      }

      if (this.isEditMode) {
        await this.operadorService.updateOperador(this.data!.id, payload);
        this.snackBar.open('Operador actualizado exitosamente', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
      } else {
        await this.operadorService.createOperador(payload as OperadorData);
        this.snackBar.open('Operador creado exitosamente', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
      }

      this.dialogRef.close(true); // signal success
    } catch (e: any) {
      console.error(e);
      let errorMsg = 'Error al guardar el operador';
      if (e.data?.data) {
        errorMsg += ': ' + JSON.stringify(e.data.data);
      } else {
        errorMsg += ': ' + e.message;
      }
      this.snackBar.open(errorMsg, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
    } finally {
      this.isLoading.set(false);
    }
  }

  togglePasswordVisibility() {
    this.hidePassword.update(v => !v);
  }
}
