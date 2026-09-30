import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { PhotoContext, SyncItem } from './types';
const QUEUE_KEY = 'drive_sync_queue_v1';
const QUEUE_DIR = `${FileSystem.documentDirectory}sync-queue/`;

// ============================================================
// 🔑 Generador de IDs único (a nivel módulo, no dentro de otra función)
// ============================================================
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
 * Copia la foto a una carpeta persistente de la app y la agrega a la cola.
 */
export async function enqueuePhoto(
  uri: string,
  description: string | undefined,
  usuario: string | undefined,
  contexto?: PhotoContext
): Promise<void> {
  await ensureQueueDir();

  // Copia la foto a la carpeta persistente de la app
  const safeName = `${Date.now()}-${uuid()}.jpg`;
  const destUri = `${QUEUE_DIR}${safeName}`;

  try {
    await FileSystem.copyAsync({ from: uri, to: destUri });
  } catch (e) {
    console.warn('⚠️ No se pudo copiar la foto, usando la original:', e);
  }

  const queue = await getQueue();

  const item: SyncItem = {
    id: uuid(),                                   // ✅ Llamada a la función
    localUri: destUri,
    filename: safeName,
    description,
    usuario,
    capturedAt: new Date().toISOString(),
    createdAt: Date.now(),
    status: 'pending',
    attempts: 0,
    estacion_servicio_actividad_id: contexto?.estacion_servicio_actividad_id,
    latitud: contexto?.latitud,
    longitud: contexto?.longitud,
    altitud: contexto?.altitud,
    precision: contexto?.precision,
    direccion: contexto?.direccion,
    ubicacion_texto: contexto?.ubicacion_texto,
  };

  queue.push(item);
  await saveQueue(queue);
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
  return queue.filter(
    (i) => i.status === 'pending' || (i.status === 'error' && i.attempts < MAX_ATTEMPTS)
  );
}