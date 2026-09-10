export type SyncItemStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface SyncItem {
  id: string;
  localUri: string;
  filename: string;
  description?: string;
  createdAt: number;
  status: SyncItemStatus;
  attempts: number;
  error?: string;
  capturedAt: string;
  usuario?: string;
}
