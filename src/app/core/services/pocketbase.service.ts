import { Injectable } from '@angular/core';
import PocketBase from 'pocketbase';

@Injectable({
  providedIn: 'root'
})
export class PocketbaseService {
  public pb: PocketBase;

  constructor() {
    // PocketBase URL, default local port
    this.pb = new PocketBase('http://127.0.0.1:8090');
    // Disable request auto-cancellation to prevent issues
    this.pb.autoCancellation(false);
  }
}
