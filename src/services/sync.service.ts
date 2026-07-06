import { db } from '../db/local-db';
import { ApiService } from './api.service';

export class SyncService {
  private static isSyncing = false;
  private static onStatusChangeCallback: ((online: boolean) => void) | null = null;

  static init(onStatusChange?: (online: boolean) => void) {
    if (typeof window === 'undefined') return;

    this.onStatusChangeCallback = onStatusChange ?? null;

    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // Ejecutar una sincronización inicial si estamos online al arrancar
    if (navigator.onLine) {
      this.syncPendingData();
    }
  }

  static isOnline(): boolean {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  }

  private static handleNetworkChange(online: boolean) {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(online);
    }

    if (online) {
      this.syncPendingData();
    }
  }

  static async syncPendingData() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    console.log('🔄 Iniciando sincronización de datos offline...');

    try {
      await this.syncOrders();
      await this.syncMovements();
    } catch (error) {
      console.error('❌ Error general durante la sincronización:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private static async syncOrders() {
    const pendingOrders = await db.pedidosOffline
      .where('estadoSync')
      .anyOf(['PENDIENTE', 'FALLIDO'])
      .toArray();

    if (pendingOrders.length === 0) return;

    console.log(`📦 Sincronizando ${pendingOrders.length} pedidos acumulados offline...`);

    for (const order of pendingOrders) {
      if (!order.id) continue;

      try {
        // Marcar como procesando localmente
        await db.pedidosOffline.update(order.id, { estadoSync: 'PROCESANDO' });

        // Enviar pedido al backend NestJS
        await ApiService.post('/pedidos', {
          clientId: order.clientId,
          lineas: order.lineas,
          tipoPago: order.tipoPago,
        });

        // Eliminar pedido sincronizado exitosamente
        await db.pedidosOffline.delete(order.id);
        console.log(`✅ Pedido local #${order.id} sincronizado exitosamente.`);
      } catch (error: any) {
        console.error(`❌ Falló la sincronización del pedido #${order.id}:`, error);
        await db.pedidosOffline.update(order.id, {
          estadoSync: 'FALLIDO',
          errorMsg: error.message || 'Error desconocido al enviar',
        });
      }
    }
  }

  private static async syncMovements() {
    const pendingMovements = await db.movimientosOffline
      .where('estadoSync')
      .anyOf(['PENDIENTE', 'FALLIDO'])
      .toArray();

    if (pendingMovements.length === 0) return;

    console.log(`⚙ Sincronizando ${pendingMovements.length} movimientos de stock offline...`);

    for (const movement of pendingMovements) {
      if (!movement.id) continue;

      try {
        await db.movimientosOffline.update(movement.id, { estadoSync: 'PROCESANDO' });

        // Enviar movimiento al backend
        await ApiService.post(`/inventario/productos/${movement.productId}/movimiento`, {
          tallaId: movement.tallaId,
          cantidad: movement.cantidad,
          tipo: movement.tipo,
        });

        await db.movimientosOffline.delete(movement.id);
        console.log(`✅ Movimiento de stock #${movement.id} sincronizado exitosamente.`);
      } catch (error: any) {
        console.error(`❌ Falló la sincronización del movimiento #${movement.id}:`, error);
        await db.movimientosOffline.update(movement.id, {
          estadoSync: 'FALLIDO',
          errorMsg: error.message || 'Error desconocido',
        });
      }
    }
  }
}
