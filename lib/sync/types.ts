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

  // 🔑 Contexto de la actividad (se conoce al tomar la foto)
  estacion_servicio_actividad_id?: number;

  // 🔑 Datos capturados por GPS
  latitud?: number;
  longitud?: number;
  altitud?: number;
  precision?: number;
  direccion?: string;
  ubicacion_texto?: string;
}

export interface PhotoContext {
  estacion_servicio_actividad_id?: number;
  latitud?: number;
  longitud?: number;
  altitud?: number;
  precision?: number;
  direccion?: string;
  ubicacion_texto?: string;
}
