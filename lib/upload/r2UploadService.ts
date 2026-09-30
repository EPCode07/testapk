import * as FileSystem from 'expo-file-system/legacy';
import { getToken } from '../user/userStorage';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type PresignResponse = {
    upload_url: string;
    r2_key: string;
    expires_in: number;
};

export type UploadResult = {
    r2_key: string;
};

/**
 * Detecta contentType y extensión desde la URI.
 */
function detectImageType(uri: string): { contentType: string; extension: string } {
    const clean = uri.split('?')[0].toLowerCase();
    if (clean.endsWith('.png')) return { contentType: 'image/png', extension: 'png' };
    if (clean.endsWith('.webp')) return { contentType: 'image/webp', extension: 'webp' };
    return { contentType: 'image/jpeg', extension: 'jpg' };
}

/**
 * Sube una foto a Cloudflare R2 usando URL prefirmada.
 * Usa FileSystem.uploadAsync (nativo) en lugar de fetch+base64.
 */
export async function subirFotoAR2(localUri: string): Promise<UploadResult> {
    const token = await getToken();
    if (!token) throw new Error('No hay sesión activa (token ausente)');

    const { contentType, extension } = detectImageType(localUri);

    // 1. Pedir URL prefirmada a Laravel
    const presignRes = await fetch(`${API_BASE}/api/uploads/presign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contentType, extension }),
    });

    if (!presignRes.ok) {
        const txt = await presignRes.text();
        throw new Error(`Presign falló (${presignRes.status}): ${txt}`);
    }

    const { upload_url, r2_key }: PresignResponse = await presignRes.json();

    // 2. PUT directo a R2 con subida binaria nativa
    const result = await FileSystem.uploadAsync(upload_url, localUri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
            'Content-Type': contentType,
        },
    });

    if (result.status < 200 || result.status >= 300) {
        throw new Error(`Upload a R2 falló (${result.status}): ${result.body}`);
    }

    return { r2_key };
}