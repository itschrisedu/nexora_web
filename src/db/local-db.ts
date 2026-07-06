import Dexie, { type Table } from 'dexie';

// Interfaces de datos para IndexedDB
export interface LocalProduct {
  id: string;
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  material?: string;
  fotoUrl?: string;
  precioCosto: number;
  precioVenta: number;
  serieId: string;
  activo: boolean;
}

export interface LocalClient {
  id: string;
  nombre: string;
  cedula: string;
  email?: string;
  telefono?: string;
  limiteCredito: number;
  cupoDisponible: number;
  score: number;
  nivelCredito: string;
}

export interface LocalOfflineOrder {
  id?: number; // Auto-incremental local
  clientId: string;
  lineas: Array<{
    productId: string;
    serieId: string;
    tallaId: string;
    cantidad: number;
    precioUnitario: number;
    tipoVenta: string;
  }>;
  tipoPago: string;
  total: number;
  createdAt: number;
  estadoSync: 'PENDIENTE' | 'PROCESANDO' | 'FALLIDO';
  errorMsg?: string;
}

export interface LocalOfflineMovement {
  id?: number;
  productId: string;
  tallaId: string;
  cantidad: number;
  tipo: 'INGRESO' | 'EGRESO' | 'AJUSTE';
  createdAt: number;
  estadoSync: 'PENDIENTE' | 'PROCESANDO' | 'FALLIDO';
  errorMsg?: string;
}

export class NexoraLocalDatabase extends Dexie {
  productos!: Table<LocalProduct, string>;
  clientes!: Table<LocalClient, string>;
  pedidosOffline!: Table<LocalOfflineOrder, number>;
  movimientosOffline!: Table<LocalOfflineMovement, number>;

  constructor() {
    super('NexoraDB');
    this.version(1).stores({
      productos: 'id, codigo, nombre, marca, serieId',
      clientes: 'id, nombre, cedula, nivelCredito',
      pedidosOffline: '++id, clientId, estadoSync, createdAt',
      movimientosOffline: '++id, productId, estadoSync, createdAt',
    });
  }
}

export const db = new NexoraLocalDatabase();
export default db;
