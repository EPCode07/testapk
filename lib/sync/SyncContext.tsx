import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getUsuario } from '../user/userStorage';
import { notifySyncFinished, notifySyncStarted, requestNotificationPermissions } from './notifications';
import { enqueuePhoto, getPendingItems, getQueue, removeItem, updateItem } from './storageQueue';
import { syncPreferences } from './syncPreferences';
import { SyncItem } from './types';
import { uploadItem } from './uploadService';

interface SyncContextValue {
  queue: SyncItem[];
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
  refreshQueue: () => Promise<void>;
  syncNow: (force?: boolean) => Promise<void>;
  addPhotoToQueue: (uri: string, description?: string) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<SyncItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const syncingRef = useRef(false);

  const refreshQueue = useCallback(async () => {
    setQueue(await getQueue());
  }, []);

  /**
   * ¿Podemos sincronizar con el estado actual de red?
   */
  const canSyncWithNetwork = useCallback(async (state: {
    isConnected: boolean | null;
    isInternetReachable?: boolean | null;
    type: string;
  }): Promise<boolean> => {
    if (!state.isConnected) return false;
    if (state.isInternetReachable === false) return false;

    const pref = await syncPreferences.getNetwork();

    if (pref === 'any') return true;
    // pref === 'wifi'
    return state.type === 'wifi';
  }, []);

  /**
   * Sincroniza la cola.
   * @param force Si es true, ignora la preferencia de red (sync manual del usuario)
   */
  const syncNow = useCallback(
    async (force: boolean = false) => {
      if (syncingRef.current) return;

      // Verificar red ANTES de empezar
      const net = await NetInfo.fetch();
      if (!force) {
        const can = await canSyncWithNetwork(net);
        if (!can) {
          console.log('[Sync] Red actual no permite sincronizar (preferencia)');
          return;
        }
      }

      const pending = await getPendingItems();
      if (pending.length === 0) return;

      syncingRef.current = true;
      setIsSyncing(true);
      await notifySyncStarted(pending.length);

      let uploaded = 0;
      let failed = 0;

      for (const item of pending) {
        try {
          await updateItem(item.id, { status: 'uploading' });
          await refreshQueue();
          await uploadItem(item);
          await removeItem(item.id);
          uploaded += 1;
        } catch (err: any) {
          failed += 1;
          console.error(`❌ Falló la subida del ítem ${item.id}:`, err?.message ?? err);
          await updateItem(item.id, {
            status: 'error',
            attempts: (item.attempts ?? 0) + 1,
            error: err?.message ?? 'Error desconocido',
          });
        }
        await refreshQueue();
      }

      await notifySyncFinished(uploaded, failed);
      syncingRef.current = false;
      setIsSyncing(false);
    },
    [refreshQueue, canSyncWithNetwork]
  );

  const addPhotoToQueue = useCallback(
    async (uri: string, description?: string) => {
      const usuario = (await getUsuario()) ?? undefined;
      await enqueuePhoto(uri, description, usuario);
      await refreshQueue();

      // 👇 Solo sincroniza si la red lo permite
      const net = await NetInfo.fetch();
      const can = await canSyncWithNetwork(net);
      if (can) {
        syncNow();
      } else {
        console.log('[Sync] Foto encolada, se subirá cuando la red lo permita');
      }
    },
    [refreshQueue, syncNow, canSyncWithNetwork]
  );

  useEffect(() => {
    requestNotificationPermissions();
    refreshQueue();

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      // Actualizar isOnline
      setIsOnline(!!state.isConnected && state.isInternetReachable !== false);

      // ¿Debemos sincronizar?
      const can = await canSyncWithNetwork(state);
      if (can) {
        syncNow();
      }
    });

    return () => unsubscribe();
  }, [refreshQueue, syncNow, canSyncWithNetwork]);

  const pendingCount = queue.filter((i) => i.status !== 'done').length;

  return (
    <SyncContext.Provider
      value={{
        queue,
        isSyncing,
        isOnline,
        pendingCount,
        refreshQueue,
        syncNow,
        addPhotoToQueue,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync debe usarse dentro de <SyncProvider>');
  return ctx;
}