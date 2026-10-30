import * as ImageManipulator from 'expo-image-manipulator';
import { getToken } from '../user/userStorage';
import { ActividadEnCurso } from './types';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type ResultadoExportacion = {
    success: boolean;
    actividad?: { id: number; estado: string, es_multidia?: boolean };
    registros?: number[];
    total_fotos?: number;
    message?: string;
};

export async function exportarActividadAlServidor(
    actividad: ActividadEnCurso
): Promise<ResultadoExportacion> {
    const token = await getToken();
    if (!token) return { success: false, message: 'Sin sesión activa' };


    // 1. COMPRIMIR LAS FOTOS ANTES DE ENVIAR (Clave para que no colapse)
    const fotosComprimidas = [];
    for (const foto of actividad.fotos) {
        try {
            const resultado = await ImageManipulator.manipulateAsync(
                foto.uriLocal,
                [{ resize: { width: 1000 } }], // Reducir a 1000px de ancho
                { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG } // Calidad 50%
            );
            fotosComprimidas.push({ ...foto, uriLocal: resultado.uri });
        } catch (e) {
            console.warn("No se pudo comprimir la foto, se enviará original", e);
            fotosComprimidas.push(foto);
        }
    }

    const metadata = {
        estacion_servicio_actividad_id: actividad.estacionServicioActividadId,
        descripcion_general: actividad.descripcionGeneral ?? '',
        conforme: actividad.conforme ? 1 : 0,
        fotos: fotosComprimidas.map((f, i) => ({
            orden: (f as any).ordenOriginal ?? i, // <-- Usamos el orden real
            descripcion: f.descripcionIndividual ?? null,
            latitud: f.latitud ?? null,
            longitud: f.longitud ?? null,
            altitud: f.altitud ?? null,
            precision: f.precision ?? null,
            heading: f.heading ?? null,
            captured_at: f.timestamp,
            direccion: f.direccion ?? null,
            ubicacion_texto: f.ubicacionTexto ?? null,
        })),
    };

    const formData = new FormData();
    formData.append('metadata', JSON.stringify(metadata));

    fotosComprimidas.forEach((foto, i) => {
        // 🔥 LOG MEJORADO: Muestra el ID real y si tiene o no texto
        console.log(`[Exportar] Enviando Foto ID: ${foto.idLocal} | Descripción: "${foto.descripcionIndividual || 'Sin texto'}"`);

        let uri = String(foto.uriLocal ?? '').trim();
        if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
            uri = `file://${uri}`;
        }
        formData.append('fotos[]', {
            uri,
            name: `foto-${i}.jpg`,
            type: 'image/jpeg',
        } as any);
    });

    // 3. USAR XMLHttpRequest (React Native sí lo soporta nativamente)
    try {
        const responseText = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            let timeoutId: any;

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (timeoutId) clearTimeout(timeoutId);
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.responseText);
                    } else {
                        reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText || 'Error'}`));
                    }
                }
            };

            xhr.onerror = () => { if (timeoutId) clearTimeout(timeoutId); reject(new Error('Error de red')); };
            xhr.ontimeout = () => { if (timeoutId) clearTimeout(timeoutId); reject(new Error('Timeout')); };

            // 🔥 KILL SWITCH: Si pasan 45 segundos, abortamos la petición y liberamos la app
            timeoutId = setTimeout(() => {
                xhr.abort();
                reject(new Error('Tiempo de espera agotado. El archivo es muy pesado.'));
            }, 45000);

            xhr.open('POST', `${API_BASE}/api/actividades/exportar`);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });

        const json = JSON.parse(responseText);

        if (!json.success) {
            throw new Error(json.message || 'Error en el servidor');
        }

        return {
            message: 'Actividad exportada correctamente',
            success: true,
            actividad: json.actividad,
            registros: json.registros,
            total_fotos: json.total_fotos,
        };
    } catch (err: any) {
        console.error("Fallo de exportación:", err);
        return {
            success: false,
            message: err.message || 'Error de conexión',
        };
    }
}