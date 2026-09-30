import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { actividadStorage } from '../actividades/actividadStorage';
import { exportarActividadAlServidor } from '../actividades/exportarActividad';
import { exportacionesStorage } from '../exportaciones/exportacionesStorage';
import { ExportacionItem } from '../exportaciones/types';
import { getUsuario } from '../user/userStorage';
import { notifySyncFinished, notifySyncStarted, requestNotificationPermissions } from './notifications';
import { enqueuePhoto, getPendingItems, getQueue, removeItem, updateItem } from './storageQueue';
import { syncPreferences } from './syncPreferences';
import { PhotoContext, SyncItem } from './types';
import { uploadItem } from './uploadService';

interface SyncContextValue {
  queue: SyncItem[];
  exportacionesQueue: ExportacionItem[];
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
  pendingExportacionesCount: number;
  refreshQueue: () => Promise<void>;
  refreshExportaciones: () => Promise<void>;
  syncNow: (force?: boolean) => Promise<void>;
  syncExportacionesNow: (force?: boolean) => Promise<void>;
  addPhotoToQueue: (
    uri: string,
    description?: string,
    contexto?: PhotoContext
  ) => Promise<void>;
  addExportacionToQueue: (data: {
    actividadLocalId: string;
    estacionServicioActividadId: number;
    estacionId: number;
    proyectoId: number;
    totalFotos: number;
  }) => Promise<void>;
  reintentarExportacion: (id: string) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<SyncItem[]>([]);
  const [exportacionesQueue, setExportacionesQueue] = useState<ExportacionItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const syncingRef = useRef(false);
  const syncingExpRef = useRef(false);

  // ============ REFRESH ============

  const refreshQueue = useCallback(async () => {
    const q = await getQueue();
    setQueue(q);
  }, []);

  const refreshExportaciones = useCallback(async () => {
    const q = await exportacionesStorage.listar();
    setExportacionesQueue(q);
  }, []);

  // ============ UTILIDADES DE RED ============

  const canSyncWithNetwork = useCallback(async (state: {
    isConnected: boolean | null;
    isInternetReachable?: boolean | null;
    type: string;
  }): Promise<boolean> => {
    if (!state.isConnected) return false;
    if (state.isInternetReachable === false) return false;

    const pref = await syncPreferences.getNetwork();
    if (pref === 'any') return true;
    return state.type === 'wifi';
  }, []);

  // ============ SYNC DE FOTOS SUELTAS (cola legacy) ============

  const syncNow = useCallback(
    async (force: boolean = false) => {
      if (syncingRef.current) return;

      const net = await NetInfo.fetch();
      if (!force) {
        const can = await canSyncWithNetwork(net);
        if (!can) return;
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

  // ============ SYNC DE EXPORTACIONES (cola nueva) ============

  const syncExportacionesNow = useCallback(
    async (force: boolean = false) => {
      if (syncingExpRef.current) return;

      const net = await NetInfo.fetch();
      if (!force) {
        const can = await canSyncWithNetwork(net);
        if (!can) return;
      }

      const pendientes = await exportacionesStorage.listarPendientes();
      if (pendientes.length === 0) return;

      syncingExpRef.current = true;
      setIsSyncing(true);
      await notifySyncStarted(pendientes.length);

      let ok = 0;
      let failed = 0;

      for (const item of pendientes) {
        try {
          // 1. Leer la actividad desde AsyncStorage
          const actividad = await actividadStorage.obtener(item.actividadLocalId);
          if (!actividad) {
            // No existe la actividad, sacar de la cola
            await exportacionesStorage.eliminar(item.id);
            continue;
          }

          // 2. Subir al servidor
          const resultado = await exportarActividadAlServidor(actividad);

          if (!resultado.success) {
            await exportacionesStorage.marcarError(
              item.id,
              resultado.message ?? 'Error desconocido'
            );
            failed += 1;
            continue;
          }

          // 3. Éxito: marcar la actividad como exportada y sacarla de la cola
          await actividadStorage.marcarExportada(item.actividadLocalId);
          await exportacionesStorage.eliminar(item.id);
          ok += 1;
        } catch (err: any) {
          failed += 1;
          await exportacionesStorage.marcarError(
            item.id,
            err?.message ?? 'Error inesperado'
          );
        }
        await refreshExportaciones();
      }

      await notifySyncFinished(ok, failed);
      syncingExpRef.current = false;
      setIsSyncing(false);
    },
    [refreshExportaciones, canSyncWithNetwork]
  );

  // ============ ADD TO QUEUES ============

  const addPhotoToQueue = useCallback(
    async (
      uri: string,
      description: string | undefined,
      contexto?: PhotoContext
    ) => {
      const usuario = (await getUsuario()) ?? undefined;
      await enqueuePhoto(uri, description, usuario, contexto);
      await refreshQueue();

      const net = await NetInfo.fetch();
      const can = await canSyncWithNetwork(net);
      if (can) syncNow();
    },
    [refreshQueue, syncNow, canSyncWithNetwork]
  );

  const addExportacionToQueue = useCallback(
    async (data: {
      actividadLocalId: string;
      estacionServicioActividadId: number;
      estacionId: number;
      proyectoId: number;
      totalFotos: number;
    }) => {
      await exportacionesStorage.encolar(data);
      await refreshExportaciones();

      const net = await NetInfo.fetch();
      const can = await canSyncWithNetwork(net);
      if (can) syncExportacionesNow();
    },
    [refreshExportaciones, syncExportacionesNow, canSyncWithNetwork]
  );

  const reintentarExportacion = useCallback(
    async (id: string) => {
      await exportacionesStorage.marcarPendiente(id);
      await refreshExportaciones();
      await syncExportacionesNow(true);
    },
    [refreshExportaciones, syncExportacionesNow]
  );

  // ============ LISTENER DE RED + CARGA INICIAL ============

  useEffect(() => {
    requestNotificationPermissions();
    refreshQueue();
    refreshExportaciones();

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      setIsOnline(!!state.isConnected && state.isInternetReachable !== false);

      const can = await canSyncWithNetwork(state);
      if (can) {
        syncNow();
        syncExportacionesNow();
      }
    });

    return () => unsubscribe();
  }, [refreshQueue, refreshExportaciones, syncNow, syncExportacionesNow, canSyncWithNetwork]);

  const pendingCount = queue.filter((i) => i.status !== 'done').length;
  const pendingExportacionesCount = exportacionesQueue.filter(
    (e) => e.estado === 'pendiente' || e.estado === 'error'
  ).length;

  return (
    <SyncContext.Provider
      value={{
        queue,
        exportacionesQueue,
        isSyncing,
        isOnline,
        pendingCount,
        pendingExportacionesCount,
        refreshQueue,
        refreshExportaciones,
        syncNow,
        syncExportacionesNow,
        addPhotoToQueue,
        addExportacionToQueue,
        reintentarExportacion,
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