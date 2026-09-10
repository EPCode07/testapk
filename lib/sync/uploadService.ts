import * as FileSystem from 'expo-file-system/legacy';
import { SyncItem } from './types';

export async function uploadItem(item: SyncItem): Promise<void> {
  const result = await FileSystem.uploadAsync(`${process.env.EXPO_PUBLIC_BACKEND_URL}/upload`, item.localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'photo',
    mimeType: 'image/jpeg',
    parameters: {
      filename: item.filename,
      description: item.description ?? '',
    },
    headers: { 'x-api-secret': process.env.EXPO_PUBLIC_API_SECRET ?? '' },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload falló con status ${result.status}: ${result.body}`);
  }
}