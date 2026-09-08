import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import NetInfo from '@react-native-community/netinfo';
import { getPendingItems, updateItem, removeItem } from './storageQueue';
import { uploadItem } from './uploadService';
import { notifySyncStarted, notifySyncFinished } from './notifications';

export const SYNC_TASK_NAME = 'drive-background-sync';

TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected || net.isInternetReachable === false) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const pending = await getPendingItems();
    if (pending.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    await notifySyncStarted(pending.length);
    let uploaded = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        await updateItem(item.id, { status: 'uploading' });
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
    }

    await notifySyncFinished(uploaded, failed);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    console.error('Error en tarea de sincronización en segundo plano:', e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    console.warn('Background fetch no disponible (restringido por el usuario o el sistema).');
    return;
  }

  const already = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
  if (already) return;

  await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
    minimumInterval: 15 * 60, // 15 min: mínimo permitido por iOS/Android, no es instantáneo
    stopOnTerminate: false, // sigue registrada aunque el usuario cierre la app (Android)
    startOnBoot: true, // se reactiva al reiniciar el dispositivo
  });
}
