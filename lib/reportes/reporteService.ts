import * as FileSystem from 'expo-file-system/legacy';
import { authService } from '../user/authService';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

async function getToken() {
    const token = await authService.getToken();
    if (!token) throw new Error('Sin sesión');
    return token;
}

export type ReporteResumen = {
    id: number;
    codigo: string;
    fecha: string;
    estacion_id: number;
    estacion_codigo: string;
    total_fotos: number;
    estado: 'abierto' | 'revisado' | 'aprobado' | 'rechazado';
    motivo_rechazo: string | null;
    resumen_ejecutivo: string | null;
    creado_en: string;
    revisado_en: string | null;
    aprobado_en: string | null;
};

export type ResumenDia = {
    total_fotos: number;
    total_actividades: number;
    total_sucesos: number;
    actividades: Array<{
        actividad_id: number;
        actividad_nombre: string;
        total_fotos: number;
        conforme: boolean;
    }>;
};

export const reporteService = {
    /**
     * Obtiene el resumen previo al cierre del día.
     */
    async resumenDia(estacionId: number): Promise<ResumenDia> {
        const token = await getToken();
        const res = await fetch(
            `${BASE_URL}/api/reportes/resumen-dia?estacion_id=${estacionId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.message ?? 'Error al obtener el resumen');
        }
        return json;
    },

    /**
     * Lista los reportes del técnico (o todos si es supervisor).
     */
    async listar(): Promise<ReporteResumen[]> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/reportes`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.message ?? 'Error al listar reportes');
        }
        return json.data;
    },

    /**
     * Obtiene el prompt para la IA.
     */
    async obtenerPrompt(reporteId: number): Promise<string> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/reportes/${reporteId}/prompt`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');
        return json.prompt;
    },

    /**
     * Guarda el resumen ejecutivo.
     */
    async guardarResumen(reporteId: number, resumen: string): Promise<void> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/reportes/${reporteId}/resumen`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ resumen }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');
    },

    async descargarPdf(reporteId: number, codigo?: string, fecha?: string): Promise<string> {
        const token = await getToken();

        // 🔑 Nombre: "RD-26-0005 - 2026-09-28.pdf"
        const partes = [
            codigo ?? `RD-${reporteId}`,
            fecha ?? new Date().toISOString().slice(0, 10),
        ];
        const nombreArchivo = `${partes.join(' - ')}.pdf`;

        const dir = `${FileSystem.documentDirectory}reportes/`;
        const uri = `${dir}${nombreArchivo}`;

        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) {
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }

        const result = await FileSystem.downloadAsync(
            `${BASE_URL}/api/reportes/${reporteId}/pdf`,
            uri,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (result.status !== 200) {
            throw new Error(`Error descargando PDF: ${result.status}`);
        }

        return result.uri;
    },

    /**
 * Reabre un reporte observado para correcciones.
 */
    async subsanar(reporteId: number): Promise<{ codigo: string; estado: string }> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/reportes/${reporteId}/subsanar`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');
        return json.reporte;
    },

    /**
     * Modifica cerrarDia para aceptar reporteId opcional (modo corrección).
     */
    async cerrarDia(data: {
        estacion_id: number;
        observaciones?: string;
        dias_con_accidentes?: boolean;
        dias_con_lluvia?: boolean;
        reporte_id?: number;   // 👈 nuevo
    }): Promise<{ reporte: any; fotos_agregadas?: number; es_duplicado?: boolean }> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/reportes/cerrar-dia`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');
        return json;
    },
};