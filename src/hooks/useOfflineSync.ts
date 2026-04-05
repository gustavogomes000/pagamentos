import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/dexieDb';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook de sincronização assíncrona.
 * Instanciar na barreira inicial do App.tsx ou Dashboard
 */
export function useOfflineSync() {
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);

  const updateCount = useCallback(async () => {
    try {
      const count = await db.syncQueue.where('status').equals('PENDING').count();
      setPendingCount(count);
    } catch (err) {
      console.error("Erro ao contar fila de sincronização:", err);
    }
  }, []);

  const processSyncQueue = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;
    
    // Evita múltiplas execuções simultâneas
    syncingRef.current = true;
    setSyncing(true);
    
    try {
      const pendingOperations = await db.syncQueue
        .where('status')
        .equals('PENDING')
        .toArray();

      if (pendingOperations.length === 0) {
        setPendingCount(0);
        return;
      }

      console.log(`[Sync] Iniciando sincronização de ${pendingOperations.length} operações... (${new Date().toISOString()})`);
      toast.info(`Sincronizando ${pendingOperations.length} registros salvos offline...`, { id: 'sync-progress', duration: 10000 });

      let successCount = 0;
      let errorCount = 0;

      for (const op of pendingOperations) {
        try {
          let error = null;

          switch (op.action) {
            case 'INSERT': {
              const res = await supabase.from(op.table as any).insert(op.payload);
              error = res.error;
              break;
            }
            case 'UPDATE': {
              const req = supabase.from(op.table as any).update(op.payload);
              if (op.matchKey) {
                const reqMatch = req.match(op.matchKey);
                const res = await reqMatch;
                error = res.error;
              } else {
                 throw new Error("MatchKey missing in UPDATE");
              }
              break;
            }
            case 'DELETE': {
              if (op.matchKey) {
                const res = await supabase.from(op.table as any).delete().match(op.matchKey);
                error = res.error;
              }
              break;
            }
            case 'RPC': {
              const res = await supabase.rpc(op.table as any, op.payload);
              error = res.error;
              break;
            }
          }

          if (error) throw error;
          
          await db.syncQueue.delete(op.id!);
          successCount++;
        } catch (err: any) {
           console.error('[Sync] Falha em operação na fila:', { table: op.table, action: op.action, error: err.message, retryCount: op.retryCount });
           errorCount++;
           // Após 5 tentativas, marca como ERROR permanente
           const newRetry = op.retryCount + 1;
           await db.syncQueue.update(op.id!, { 
             status: newRetry >= 5 ? 'ERROR' : 'PENDING',
             errorMessage: err.message,
             retryCount: newRetry,
           });
        }
      }

      if (successCount > 0) {
        toast.success(`Tudo atualizado! ${successCount} registros subiram pra nuvem.`, { id: 'sync-progress' });
      } else if (errorCount > 0) {
        toast.error(`Falha ao sincronizar ${errorCount} registros (Verifique logs)`, { id: 'sync-progress' });
      } else {
        toast.dismiss('sync-progress');
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      updateCount();
    }
  }, [updateCount]);

  useEffect(() => {
    updateCount();

    // Hook para atualizar contador sempre que houver mudança no banco
    db.syncQueue.hook('creating', () => { setTimeout(updateCount, 100); });
    db.syncQueue.hook('updating', () => { setTimeout(updateCount, 100); });
    db.syncQueue.hook('deleting', () => { setTimeout(updateCount, 100); });

    const handleOnline = () => {
      processSyncQueue();
    };

    window.addEventListener('online', handleOnline);
    
    if (navigator.onLine) {
      processSyncQueue();
    }

    const interval = setInterval(() => {
       if (navigator.onLine) processSyncQueue();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [processSyncQueue, updateCount]);

  return { 
    syncing, 
    pendingCount, 
    syncQueue: processSyncQueue 
  };
}
