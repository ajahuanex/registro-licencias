import { Injectable } from '@angular/core';
import PocketBase from 'pocketbase';

@Injectable({
  providedIn: 'root'
})
export class PocketbaseService {
  public pb: PocketBase;

  constructor() {
    // Always use the Angular dev server's origin + /pb-api proxy path
    // Vite proxy forwards /pb-api/* -> http://127.0.0.1:8090/*
    // This works for both localhost AND phones on the same network
    // because the Vite server (on the PC) proxies the request to PocketBase
    const origin = (typeof window !== 'undefined') ? window.location.origin : 'http://localhost:4200';
    const baseUrl = (origin + '/pb-api').replace(/\/+$/, '');
    console.log('[POCKETBASE] Base URL configurada:', baseUrl);
    this.pb = new PocketBase(baseUrl);
    this.pb.autoCancellation(false);
  }
}
