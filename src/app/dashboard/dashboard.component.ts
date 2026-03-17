import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ExpedienteService } from '../core/services/expediente.service';
import { RecordModel } from 'pocketbase';

interface DashboardStats {
  total: number;
  duplicados: number; // Duplicados meaning "Tramite = Duplicado" as per context
  revalidaciones: number;
  puno: number;
  juliaca: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private expedienteService = inject(ExpedienteService);
  
  stats = signal<DashboardStats>({
    total: 0,
    duplicados: 0,
    revalidaciones: 0,
    puno: 0,
    juliaca: 0
  });

  isLoading = signal<boolean>(true);

  async ngOnInit() {
    await this.loadDailyStats();
  }

  async loadDailyStats() {
    this.isLoading.set(true);
    try {
      // Get today's date in YYYY-MM-DD
      const dateString = new Date().toISOString().split('T')[0];
      const records = await this.expedienteService.getDailyConsolidated(dateString);
      
      this.calculateStats(records);
    } catch(err) {
      console.error(err);
    } finally {
      this.isLoading.set(false);
    }
  }

  private calculateStats(records: RecordModel[]) {
    let total = records.length;
    let duplicados = 0;
    let revalidaciones = 0;
    let puno = 0;
    let juliaca = 0;

    for (const record of records) {
      if (record['tramite'] === 'Duplicado') duplicados++;
      if (record['tramite'] === 'Revalidación') revalidaciones++;
      
      if (record['lugar_entrega'] === 'Puno') puno++;
      if (record['lugar_entrega'] === 'Juliaca') juliaca++;
    }

    this.stats.set({
      total,
      duplicados,
      revalidaciones,
      puno,
      juliaca
    });
  }
}
