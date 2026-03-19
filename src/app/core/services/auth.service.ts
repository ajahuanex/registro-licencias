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
      this.currentUser.set(model);
    });
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
    this.pbService.pb.authStore.clear();
    this.router.navigate(['/login']);
  }
}
