import { db } from './dexieDb';
import { toast } from 'sonner';

interface ExecOfflineOptions {
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC';
  table: string;
  payload: any;
  matchKey?: Record<string, any>;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

export async function execOnlineOrEnqueue(
  operation: () => Promise<any>,
  offlineFallback: ExecOfflineOptions
) {
  if (navigator.onLine) {
    try {
      const response = await operation();
      // Verificando response pattern supabase com .error
      if (response && response.error) {
         throw response.error;
      }
      if (offlineFallback.onSuccess) offlineFallback.onSuccess();
      return response;
    } catch (error) {
      console.warn('⚠️ Operação online falhou. O sistema tentará agendar localmente...', error);
    }
  }

  // Fila offline fallback
  try {
    await db.syncQueue.add({
      action: offlineFallback.action,
      table: offlineFallback.table,
      payload: offlineFallback.payload,
      matchKey: offlineFallback.matchKey,
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0
    });
    
    toast.success('Modo Offline: ação salva. Será sincronizada automaticamente na reconexão da rede.');
    if (offlineFallback.onSuccess) offlineFallback.onSuccess();

    // Fabricando um objeto neutro para o app não quebrar
    return { data: offlineFallback.payload, error: null };
  } catch (dbError) {
    console.error('CRITICAL: Falha ao inserir operação no IndexedDB de filas.', dbError);
    toast.error('Erro crítico: memória local cheia ou sem suporte IndexedDB.');
    if (offlineFallback.onError) offlineFallback.onError(dbError);
    return { error: dbError };
  }
}
