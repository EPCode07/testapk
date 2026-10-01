import { getToken } from '../user/userStorage';
import { ActividadEnCurso } from './types';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type ResultadoExportacion = {
    success: boolean;
    actividad?: { id: number; estado: string };
    registros?: number[];
    total_fotos?: number;
    message?: string;
};

export async function exportarActividadAlServidor(
    actividad: ActividadEnCurso
): Promise<ResultadoExportacion> {
    const token = await getToken();
    if (!token) {
        return { success: false, message: 'Sin sesión activa' };
    }

    // 🎯 Metadata aplanada en un solo JSON string
    const metadata = {
        estacion_servicio_actividad_id: actividad.estacionServicioActividadId,
        descripcion_general: actividad.descripcionGeneral ?? '',
        conforme: actividad.conforme ? 1 : 0,
        fotos: actividad.fotos.map((f, i) => ({
            orden: i,
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

    // 1. Metadata como JSON string
    formData.append('metadata', JSON.stringify(metadata));

    // 2. Archivos con nombre plano + sanitización defensiva
    actividad.fotos.forEach((foto, i) => {
        const uri = String(foto.uriLocal ?? '').trim();

        if (!uri) {
            console.warn(`⚠️ Foto ${i} sin URI, saltando`);
            return;
        }

        formData.append('fotos[]', {
            uri,
            name: `foto-${i}.jpg`,
            type: 'image/jpeg',
        } as any);
    });
    try {
        const url = `${API_BASE}/api/actividades/exportar`;

        const responseText = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.responseText);
                    } else {
                        reject(
                            new Error(
                                `HTTP ${xhr.status}: ${xhr.responseText || 'Sin respuesta'}`
                            )
                        );
                    }
                }
            };

            xhr.onerror = () => reject(new Error('Error de red'));
            xhr.ontimeout = () => reject(new Error('Timeout'));

            xhr.open('POST', url);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            // ⚠️ NO setRequestHeader('Content-Type') — el boundary se añade solo
            xhr.timeout = 60000; // 60s
            xhr.send(formData);
        });

        const json = JSON.parse(responseText);

        if (!json.success) {
            return {
                success: false,
                message: 'Error desconocido',
            };
        }

        return {
            message: 'Actividad exportada correctamente',
            success: true,
            actividad: json.actividad,
            registros: json.registros,
            total_fotos: json.total_fotos,
        };
    } catch (err: any) {
        return {
            success: false,
            message: 'Error de conexión',
        };
    }
}