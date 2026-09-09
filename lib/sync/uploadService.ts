import * as FileSystem from 'expo-file-system/legacy';
import { SyncItem } from './types';

// TODO: reemplaza por la URL pública HTTPS de tu backend ya desplegado (server/README.md paso 4)
const BACKEND_URL = 'https://testapk-wspv.onrender.com';

// TODO: debe ser IDÉNTICO al API_SECRET configurado en server/.env
const API_SECRET = 'sdfkn98f4fn0jfJHHW1H78S2N398u0ioj64@298286423489njnjn$';

export async function uploadItem(item: SyncItem): Promise<void> {
  const result = await FileSystem.uploadAsync(`${BACKEND_URL}/upload`, item.localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'photo',
    mimeType: 'image/jpeg',
    parameters: { filename: item.filename },
    headers: { 'x-api-secret': API_SECRET },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload falló con status ${result.status}: ${result.body}`);
  }
}
