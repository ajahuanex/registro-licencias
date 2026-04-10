import { Injectable, inject } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';
import PocketBase from 'pocketbase';

@Injectable({
  providedIn: 'root'
})
export class SeedDataService {
  private pbService = inject(PocketbaseService);

  private sedesEjemplo = ['PUNO', 'JULIACA'];
  private nombresEjemplo = [
    'JUAN PEREZ MAMANI', 'MARIA QUISPE CONDORI', 'CARLOS LOPEZ APAZA', 
    'ANA GARCIA FLORES', 'LUIS TORRES CHOQUE', 'ROSA MEDINA VILCA',
    'JOSE CALISAYA HUAQUISTO', 'ELENA PINTO MACHACA', 'RICARDO COILA RIVAS',
    'ADRIAN VELASQUEZ FLORES'
  ];
  private tramitesEjemplo = ['OBTENCIÓN', 'REVALIDACIÓN', 'DUPLICADO', 'RECATEGORIZACIÓN'];
  private categoriasEjemplo = ['A-I', 'A-IIa', 'A-IIIc', 'B-IIb'];
  private estadosEjemplo = ['EN PROCESO', 'IMPRESO', 'VERIFICADO', 'ENTREGADO', 'OBSERVADO', 'ATENDIDO'];

  /**
   * Genera datos de ejemplo realistas.
   */
  async seedRealisticData(adminClient: PocketBase) {
    console.log('[LICENCIAS] Iniciando seeding de datos...');
    
    // 1. Asegurar Sedes
    const sedesIds: string[] = [];
    for (const s of this.sedesEjemplo) {
      try {
        const existing = await adminClient.collection('sedes').getFirstListItem(`nombre = "${s}"`).catch(() => null);
        if (existing) {
          sedesIds.push(existing.id);
        } else {
          const created = await adminClient.collection('sedes').create({ nombre: s, es_ejemplo: true, es_centro_entrega: true });
          sedesIds.push(created.id);
        }
      } catch (e) {
        console.warn(`Error al crear sede ${s}:`, e);
      }
    }

    // 2. Crear Operadores de ejemplo
    const operadoresIds: any[] = [];
    const roles = ['REGISTRADOR', 'IMPRESOR', 'SUPERVISOR', 'ENTREGADOR'];
    
    for (let i = 0; i < 4; i++) {
        const dni = `8888800${i}`;
        const username = `op_demo_${i}_${Date.now().toString().slice(-4)}`; // Username más único
        try {
            let op = await adminClient.collection('operadores').getFirstListItem(`dni = "${dni}"`).catch(() => null);
            if (!op) {
                op = await adminClient.collection('operadores').create({
                    username: username,
                    email: `demo_${i}_${Date.now()}@example.com`,
                    password: 'password123',
                    passwordConfirm: 'password123',
                    dni: dni,
                    nombre: this.nombresEjemplo[i],
                    perfil: roles[i],
                    sede: this.sedesEjemplo[0],
                    es_ejemplo: true
                });
            }
            if (op) {
                operadoresIds.push({ id: op.id, nombre: op['nombre'], perfil: op['perfil'] });
            }
        } catch (e: any) {
            const fieldErrors = e.response?.data ? JSON.stringify(e.response.data) : 'n/a';
            console.error(`❌ Error al crear/obtener operador ${dni}:`, e.response || e);
            console.error(`🔍 Detalles de campos: ${fieldErrors}`);
        }
    }

    if (operadoresIds.length === 0) {
      throw new Error('No se pudieron crear operadores de prueba. ¿Ejecutaste "Sincronizar Esquema" primero?');
    }

    // 3. Crear Expedientes
    const count = 80;
    for (let i = 0; i < count; i++) {
        const nombre = this.nombresEjemplo[Math.floor(Math.random() * this.nombresEjemplo.length)];
        const tramite = ['OBTENCIÓN', 'REVALIDACIÓN', 'DUPLICADO', 'RECATEGORIZACIÓN'][Math.floor(Math.random() * 4)];
        const categoria = ['A-I', 'A-IIa', 'A-IIb', 'A-IIIa', 'A-IIIb', 'A-IIIc', 'B-I', 'B-IIa', 'B-IIb', 'B-IIc'][Math.floor(Math.random() * 10)];
        const sede = this.sedesEjemplo[Math.floor(Math.random() * this.sedesEjemplo.length)];
        const estado = ['EN PROCESO', 'OBSERVADO', 'IMPRESO', 'ATENDIDO'][Math.floor(Math.random() * 4)];
        const operador = operadoresIds[Math.floor(Math.random() * operadoresIds.length)];

        const fechaBase = new Date();
        fechaBase.setDate(fechaBase.getDate() - Math.floor(Math.random() * 90)); // Últimos 90 días

      try {
        const expediente = await adminClient.collection('expedientes').create({
          operador: operador.id,
          dni_solicitante: `4455${Math.floor(1000 + Math.random() * 8999)}`,
          apellidos_nombres: nombre,
          tramite: tramite,
          categoria: categoria,
          lugar_entrega: sede,
          estado: estado,
          fecha_registro: fechaBase.toISOString(),
          es_ejemplo: true
        });

        // 4. Crear Historial Realista según estado
        const logs = [];
        
        // Siempre hay un log de creación
        const registradorId = operadoresIds.find(o => o.perfil === 'REGISTRADOR') || operador;
        logs.push({
          expediente_id: expediente.id,
          expediente_dni: expediente['dni_solicitante'],
          operador_id: registradorId.id,
          operador_nombre: registradorId.nombre,
          operador_perfil: registradorId.perfil,
          accion: 'CREACIÓN',
          fecha: fechaBase.toISOString(),
          estado_anterior: '',
          estado_nuevo: 'EN PROCESO',
          detalles: 'Expediente registrado en ventanilla.',
          es_ejemplo: true
        });

        if (estado === 'OBSERVADO') {
            const supervisorId = operadoresIds.find(o => o.perfil === 'SUPERVISOR') || operador;
            logs.push({
                expediente_id: expediente.id,
                expediente_dni: expediente['dni_solicitante'],
                operador_id: supervisorId.id,
                operador_nombre: supervisorId.nombre,
                operador_perfil: supervisorId.perfil,
                accion: 'OBSERVACIÓN',
                fecha: new Date(fechaBase.getTime() + 86400000).toISOString(),
                estado_anterior: 'EN PROCESO',
                estado_nuevo: 'OBSERVADO',
                detalles: 'Documentación incompleta.',
                es_ejemplo: true
            });
        }

        if (estado === 'IMPRESO' || estado === 'ATENDIDO') {
            const impresorId = operadoresIds.find(o => o.perfil === 'IMPRESOR') || operador;
            logs.push({
                expediente_id: expediente.id,
                expediente_dni: expediente['dni_solicitante'],
                operador_id: impresorId.id,
                operador_nombre: impresorId.nombre,
                operador_perfil: impresorId.perfil,
                accion: 'IMPRESIÓN',
                fecha: new Date(fechaBase.getTime() + 172800000).toISOString(),
                estado_anterior: 'EN PROCESO',
                estado_nuevo: 'IMPRESO',
                detalles: 'Licencia impresa correctamente.',
                es_ejemplo: true
            });
        }

        if (estado === 'ATENDIDO') {
            const entregadorId = operadoresIds.find(o => o.perfil === 'ENTREGADOR') || operador;
            logs.push({
                expediente_id: expediente.id,
                expediente_dni: expediente['dni_solicitante'],
                operador_id: entregadorId.id,
                operador_nombre: entregadorId.nombre,
                operador_perfil: entregadorId.perfil,
                accion: 'ENTREGA',
                fecha: new Date(fechaBase.getTime() + 259200000).toISOString(),
                estado_anterior: 'IMPRESO',
                estado_nuevo: 'ATENDIDO',
                detalles: 'Cojo entregado al ciudadano.',
                es_ejemplo: true
            });
        }

        // Insertar todos los logs
        for (const log of logs) {
            await adminClient.collection('historial_acciones').create(log);
        }

      } catch (e) {
        console.warn('Error al crear expediente de ejemplo:', e);
      }
    }

    console.log('✅ Seeding Licencias completado con historiales operativos.');
  }

  /**
   * Elimina todos los datos de ejemplo.
   */
  async clearSampleData(adminClient: PocketBase) {
    const collections = ['historial_acciones', 'expedientes', 'operadores', 'sedes'];
    
    for (const col of collections) {
      try {
        let hasMore = true;
        while (hasMore) {
           const records = await adminClient.collection(col).getList(1, 100, {
             filter: 'es_ejemplo = true'
           });
           
           if (records.items.length === 0) {
             hasMore = false;
             break;
           }

           for (const item of records.items) {
             await adminClient.collection(col).delete(item.id);
           }
           if (records.totalItems <= records.items.length) hasMore = false;
        }
      } catch (e) {
        console.warn(`Error cleaning ${col}:`, e);
      }
    }
  }
}
