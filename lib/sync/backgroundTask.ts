import NetInfo from '@react-native-community/netinfo';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { notifySyncFinished, notifySyncStarted } from './notifications';
import { getPendingItems, removeItem, updateItem } from './storageQueue';
import { uploadItem } from './uploadService';

export const SYNC_TASK_NAME = 'drive-background-sync';

TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected || net.isInternetReachable === false) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const pending = await getPendingItems();
    if (pending.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
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
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.error('Error en tarea de sincronización en segundo plano:', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundSync() {
  const status = await BackgroundTask.getStatusAsync();

  if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
    console.warn('Background task restringido por el sistema o el usuario.');
    return;
  }

  const already = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
  if (already) return;

  await BackgroundTask.registerTaskAsync(SYNC_TASK_NAME, {
    minimumInterval: 15, // ⚠️ AHORA son MINUTOS, no segundos
  });

  console.log('[BackgroundSync] Tarea registrada cada 15 min');
}