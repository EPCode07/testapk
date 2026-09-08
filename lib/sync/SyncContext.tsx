import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getQueue, getPendingItems, enqueuePhoto, updateItem, removeItem } from './storageQueue';
import { uploadItem } from './uploadService';
import { notifySyncStarted, notifySyncFinished, requestNotificationPermissions } from './notifications';
import { SyncItem } from './types';

interface SyncContextValue {
  queue: SyncItem[];
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
  refreshQueue: () => Promise<void>;
  syncNow: () => Promise<void>;
  addPhotoToQueue: (uri: string) => Promise<void>;
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

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return; // evita dos sincronizaciones simultáneas
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
  }, [refreshQueue]);

  const addPhotoToQueue = useCallback(
    async (uri: string) => {
      await enqueuePhoto(uri);
      await refreshQueue();
      const net = await NetInfo.fetch();
      if (net.isConnected && net.isInternetReachable !== false) {
        syncNow();
      }
    },
    [refreshQueue, syncNow]
  );

  useEffect(() => {
    requestNotificationPermissions();
    refreshQueue();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online) {
        syncNow();
      }
    });

    return () => unsubscribe();
  }, [refreshQueue, syncNow]);

  const pendingCount = queue.filter((i) => i.status !== 'done').length;

  return (
    <SyncContext.Provider
      value={{ queue, isSyncing, isOnline, pendingCount, refreshQueue, syncNow, addPhotoToQueue }}
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
