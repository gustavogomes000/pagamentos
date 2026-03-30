import Dexie, { type Table } from 'dexie';

export interface SyncOperation {
  id?: number;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC';
  payload: any; // O objeto inteiro de dados, ou os params do RPC
  timestamp: string;
  status: 'PENDING' | 'ERROR';
  retryCount: number;
  errorMessage?: string;
  matchKey?: Record<string, any>; // Para usar no .match() do supabase em Updates/Deletes
}

export class OfflineSyncDB extends Dexie {
  syncQueue!: Table<SyncOperation, number>;

  constructor() {
    super('sarelliOfflineDatabase');
    this.version(1).stores({
      syncQueue: '++id, table, action, status, timestamp'
    });
  }
}

export const db = new OfflineSyncDB();
