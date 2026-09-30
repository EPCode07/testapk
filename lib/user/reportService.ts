import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getUsuario } from './userStorage';

// Misma URL/secreto que ya usas en lib/sync/uploadService.ts
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_SECRET = process.env.EXPO_PUBLIC_API_SECRET;

/**
 * Descarga el reporte Word del backend (filtrado por el usuario guardado
 * en este dispositivo) y lo abre con el selector nativo de "Compartir/Abrir con".
 */
export async function getReportWordUrl(): Promise<void> {
    const usuario = await getUsuario();
    if (!usuario) {
        throw new Error('No hay un usuario configurado en este dispositivo.');
    }

    const url = `${BACKEND_URL}/report-word?usuario=${encodeURIComponent(usuario)}`;
    const destino = `${FileSystem.documentDirectory}reporte_${Date.now()}.docx`;

    console.log('📄 Descargando reporte desde:', url);

    // 1. Descargar el archivo real al almacenamiento de la app
    const resultado = await FileSystem.downloadAsync(url, destino, {
        headers: { 'x-api-secret': API_SECRET ?? '' },
    });

    if (resultado.status < 200 || resultado.status >= 300) {
        throw new Error(`No se pudo descargar el reporte (status ${resultado.status})`);
    }

    console.log('✅ Reporte descargado en:', resultado.uri);

    // 2. Abrir el selector nativo para verlo/compartirlo/guardarlo
    const disponible = await Sharing.isAvailableAsync();
    if (!disponible) {
        throw new Error('Este dispositivo no soporta compartir archivos.');
    }

    await Sharing.shareAsync(resultado.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dialogTitle: 'Abrir o compartir reporte',
    });
}