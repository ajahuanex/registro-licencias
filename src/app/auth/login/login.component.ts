import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Use Angular 17+ Signals
  loginError = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  hidePassword = signal<boolean>(true);
  captchaText = signal<string>('');
  currentIp = signal<string>('Detectando IP...');
  
  loginForm = this.fb.group({
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    password: ['', Validators.required],
    captchaInput: ['', Validators.required]
  });

  ngOnInit() {
    this.generateCaptcha();
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => this.currentIp.set(data.ip))
      .catch(() => this.currentIp.set('IP Desconocida'));
  }

  generateCaptcha() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 3; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.captchaText.set(result);
    this.loginForm.get('captchaInput')?.setValue('');
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    if (this.loginForm.value.captchaInput?.toUpperCase() !== this.captchaText()) {
       this.loginError.set('Código de seguridad (Anti-bot) incorrecto.');
       this.generateCaptcha();
       return;
    }

    this.isLoading.set(true);
    this.loginError.set(null);

    const { dni, password } = this.loginForm.value;

    const success = await this.authService.login(dni!, password!);

    this.isLoading.set(false);

    if (success) {
      this.router.navigate(['/dashboard']);
    } else {
      this.loginError.set('DNI o contraseña incorrectos. Por favor, intente nuevamente.');
      this.generateCaptcha(); // Regenerate on failure
    }
  }
}
