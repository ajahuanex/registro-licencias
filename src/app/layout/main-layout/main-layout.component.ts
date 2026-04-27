import { Component, inject, signal, effect, viewChild, TemplateRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService, ThemeMode, FontSize } from '../../core/services/theme.service';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Cambiar Contraseña</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="margin-top: 8px;">
        <mat-form-field appearance="outline" style="width:100%;">
          <mat-label>Contraseña Actual</mat-label>
          <input matInput formControlName="oldPassword" [type]="hideOld ? 'password' : 'text'">
          <button type="button" mat-icon-button matSuffix (click)="hideOld = !hideOld" tabindex="-1">
            <mat-icon>{{hideOld ? 'visibility_off' : 'visibility'}}</mat-icon>
          </button>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Nueva Contraseña (min. 8)</mat-label>
          <input matInput formControlName="password" [type]="hideNew ? 'password' : 'text'">
          <button type="button" mat-icon-button matSuffix (click)="hideNew = !hideNew" tabindex="-1">
            <mat-icon>{{hideNew ? 'visibility_off' : 'visibility'}}</mat-icon>
          </button>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Confirmar Nueva Contraseña</mat-label>
          <input matInput formControlName="passwordConfirm" [type]="hideNew ? 'password' : 'text'">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="loading()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || loading()" (click)="changePassword()">
        @if (!loading()) {
          <mat-icon>save</mat-icon>
        }
        @if (loading()) {
          <span class="spinner-small" style="margin-right:8px; display:inline-block; width:16px; height:16px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></span>
        }
        Actualizar Contraseña
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class ChangePasswordModal {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  public dialogRef = inject(MatDialogRef<ChangePasswordModal>);

  loading = signal(false);
  hideOld = true;
  hideNew = true;

  form = this.fb.group({
    oldPassword: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    passwordConfirm: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('passwordConfirm')?.value
      ? null : { mismatch: true };
  }

  async changePassword() {
    if (this.form.invalid) return;
    this.loading.set(true);
    try {
      const user = this.authService.currentUser();
      if (!user) throw new Error('No hay usuario activo');

      // The Pocketbase user's password change requires oldPassword, password, passwordConfirm
      await (this.authService as any).pbService.pb.collection('operadores').update(user.id, {
        oldPassword: this.form.value.oldPassword,
        password: this.form.value.password,
        passwordConfirm: this.form.value.passwordConfirm
      });
      
      this.snackBar.open('Contraseña actualizada correctamente', 'Cerrar', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (e: any) {
      if (e.status === 400) {
          this.snackBar.open('Error: Verifica tu contraseña actual y la longitud de la nueva.', 'Cerrar', { duration: 5000 });
      } else {
          this.snackBar.open('Error al cambiar contraseña: ' + e.message, 'Cerrar', { duration: 5000 });
      }
    } finally {
      this.loading.set(false);
    }
  }
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private snackBar = inject(MatSnackBar);
  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  sidenav = viewChild.required<MatSidenav>('sidenav');
  mobileFilterTemplate = signal<TemplateRef<any> | null>(null);

  isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(
      map(result => result.matches)
    )
  );

  isCollapsed = signal(false);

  constructor() {
    // Auto-close sidenav on mobile navigation
    effect(() => {
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        if (this.isHandset()) {
          (this.sidenav() as any).close();
        }
      });
    });
  }

  toggleSidenav() {
    if (this.isHandset()) {
      this.sidenav().toggle();
    } else {
      this.isCollapsed.update(v => !v);
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const user = this.authService.currentUser();
      if (!user) return;

      const formData = new FormData();
      formData.append('avatar', file);

      // Using the underlying PB instance from AuthService
      const updatedRecord = await (this.authService as any).pbService.pb.collection('operadores').update(user.id, formData);
      
      // Update local storage sync
      this.authService.currentUser.set(updatedRecord);
      this.snackBar.open('Foto de perfil actualizada', 'Cerrar', { duration: 3000 });
    } catch (e: any) {
      this.snackBar.open('Error al subir foto: ' + e.message, 'Cerrar', { duration: 4000 });
    }
  }

  onLogout() {
    this.authService.logout();
  }

  stopImpersonating() {
    this.authService.stopImpersonating();
  }

  openPasswordModal() {
    this.dialog.open(ChangePasswordModal, {
      width: '400px',
      maxWidth: '95vw',
      disableClose: true
    });
  }
}
