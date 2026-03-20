import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { RecordModel, AuthModel } from 'pocketbase';
import { PocketbaseService } from './pocketbase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Reactive Signal holding the current user state
  public currentUser = signal<AuthModel>(null);
  
  // Impersonation state
  public originalAuth = signal<{token: string, model: RecordModel} | null>(null);
  public isImpersonating = computed(() => this.originalAuth() !== null);
  
  // Computed signal to determine if user is authenticated
  public isLoggedIn = computed(() => this.currentUser() !== null);

  constructor(
    private pbService: PocketbaseService,
    private router: Router
  ) {
    // Initialize from existing authStore (e.g. on page refresh)
    this.currentUser.set(this.pbService.pb.authStore.model);

    // Bind PocketBase auth state changes to our Angular Signal
    this.pbService.pb.authStore.onChange((token, model) => {
      // If we are impersonating, DO NOT overwrite the impersonated user model
      // unless it's a completely new login/logout event (token changed drastically or cleared).
      if (!this.isImpersonating()) {
        this.currentUser.set(model);
      }
    });

    // Check localStorage for persisted impersonation state
    if (typeof localStorage !== 'undefined') {
      const savedImpersonation = localStorage.getItem('impersonation_state');
      if (savedImpersonation && this.pbService.pb.authStore.isValid) {
        try {
          const { original, target } = JSON.parse(savedImpersonation);
          this.originalAuth.set(original);
          this.currentUser.set(target);
        } catch (e) {
          localStorage.removeItem('impersonation_state');
        }
      }
    }
  }

  async login(dni: string, password: string): Promise<boolean> {
    console.log(`[AUTH DEBUG] Intentando login con DNI: "${dni}", Password: "${password}"`);
    try {
      this.pbService.pb.authStore.clear(); // Limpiar posible token viejo o corrupto
      const authData = await this.pbService.pb.collection('operadores').authWithPassword(dni, password);
      console.log("[AUTH DEBUG] Login exitoso, authData:", authData);
      return true;
    } catch (err: any) {
      console.error('[AUTH DEBUG] Error completo de PocketBase:', err);
      console.error('Authentication Error:', err.message);
      return false;
    }
  }

  logout(): void {
    if (this.isImpersonating()) {
      this.stopImpersonating();
    }
    this.pbService.pb.authStore.clear();
    this.router.navigate(['/login']);
  }

  // --- IMPERSONATION LOGIC ---
  impersonate(targetUser: RecordModel): void {
    // Only OTI and ADMINISTRADOR should theoretically trigger this, but we'll allow it if they reached the button.
    const currentModel = this.pbService.pb.authStore.model as RecordModel;
    if (!currentModel) return;

    if (!this.isImpersonating()) {
      // Save the real auth data
      this.originalAuth.set({
        token: this.pbService.pb.authStore.token,
        model: currentModel
      });
    }

    // Set the target user as the current user in Angular UI
    this.currentUser.set(targetUser);

    // Persist to survive reloads
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('impersonation_state', JSON.stringify({
        original: this.originalAuth(),
        target: targetUser
      }));
    }

    // Redirect to dashboard to see their view
    this.router.navigate(['/dashboard']);
  }

  stopImpersonating(): void {
    const original = this.originalAuth();
    if (original) {
      this.originalAuth.set(null);
      this.currentUser.set(original.model);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('impersonation_state');
      }
      this.router.navigate(['/dashboard']);
    }
  }
}
