import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Admin, RecordModel } from 'pocketbase';
import { PocketbaseService } from './pocketbase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Reactive Signal holding the current user state
  public currentUser = signal<RecordModel | Admin | null>(null);
  
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
    try {
      await this.pbService.pb.collection('operadores').authWithPassword(dni, password);
      return true;
    } catch (err: any) {
      console.error('Authentication Error:', err.message);
      return false;
    }
  }

  logout(): void {
    this.pbService.pb.authStore.clear();
    this.router.navigate(['/login']);
  }
}
