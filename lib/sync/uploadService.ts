import * as FileSystem from 'expo-file-system/legacy';
import { getToken } from '../user/userStorage';
import { SyncItem } from './types';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export async function uploadItem(item: SyncItem): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error('No hay sesión activa');

  const parameters: Record<string, string> = {
    filename: item.filename,
    captured_at: item.capturedAt,
  };

  if (item.description) parameters.description = item.description;
  if (item.usuario) parameters.usuario = item.usuario;
  if (item.estacion_servicio_actividad_id != null) {
    parameters.estacion_servicio_actividad_id = String(item.estacion_servicio_actividad_id);
  }
  if (item.latitud != null) parameters.latitud = String(item.latitud);
  if (item.longitud != null) parameters.longitud = String(item.longitud);
  if (item.altitud != null) parameters.altitud = String(item.altitud);
  if (item.precision != null) parameters.precision = String(item.precision);
  if (item.direccion) parameters.direccion = item.direccion;
  if (item.ubicacion_texto) parameters.ubicacion_texto = item.ubicacion_texto;

  const result = await FileSystem.uploadAsync(
    `${API_BASE}/api/uploads/photo`,
    item.localUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'photo',
      mimeType: 'image/jpeg',
      parameters,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload falló (${result.status}): ${result.body}`);
  }
}