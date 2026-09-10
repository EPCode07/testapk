import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { SyncItem } from './types';

const QUEUE_KEY = 'drive_sync_queue_v1';
const QUEUE_DIR = `${FileSystem.documentDirectory}sync-queue/`;

async function ensureQueueDir() {
  const info = await FileSystem.getInfoAsync(QUEUE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(QUEUE_DIR, { intermediates: true });
  }
}

export async function getQueue(): Promise<SyncItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveQueue(queue: SyncItem[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Copia la foto a una carpeta persistente de la app (para que sobreviva
 * aunque el usuario la borre de la galería) y la agrega a la cola.
 * @param sourceUri  URI local de la foto (ya con marca de agua aplicada)
 * @param description  Texto opcional que el usuario escribió en el preview
 */
export async function enqueuePhoto(
  sourceUri: string,
  description?: string,
  usuario?: string
): Promise<SyncItem> {
  await ensureQueueDir();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${id}.jpg`;
  const destUri = `${QUEUE_DIR}${filename}`;

  await FileSystem.copyAsync({ from: sourceUri, to: destUri });

  const item: SyncItem = {
    id,
    localUri: destUri,
    filename,
    description,
    usuario,
    createdAt: Date.now(),
    status: 'pending',
    attempts: 0,
    capturedAt: '',
  };

  const queue = await getQueue();
  queue.push(item);
  await saveQueue(queue);
  return item;
}

export async function updateItem(id: string, patch: Partial<SyncItem>) {
  const queue = await getQueue();
  const idx = queue.findIndex((i) => i.id === id);
  if (idx === -1) return;
  queue[idx] = { ...queue[idx], ...patch };
  await saveQueue(queue);
}

export async function removeItem(id: string) {
  const queue = await getQueue();
  const item = queue.find((i) => i.id === id);
  const next = queue.filter((i) => i.id !== id);
  await saveQueue(next);
  if (item) {
    FileSystem.deleteAsync(item.localUri, { idempotent: true }).catch(() => { });
  }
}

export async function getPendingItems(): Promise<SyncItem[]> {
  const MAX_ATTEMPTS = 3;
  const queue = await getQueue();
  // Solo reintenta ítems 'pending', o 'error' que aún no llegaron al máximo de intentos.
  // Así un ítem corrupto deja de intentarse para siempre y de arruinar la notificación.
  return queue.filter(
    (i) => i.status === 'pending' || (i.status === 'error' && i.attempts < MAX_ATTEMPTS)
  );
}