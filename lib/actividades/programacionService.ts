import { authService } from '../user/authService';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

async function getToken() {
    const token = await authService.getToken();
    if (!token) throw new Error('Sin sesión');
    return token;
}

export type ActividadProgramable = {
    id: number;
    nombre: string;
    tipo: string;
    estado: string;
    descripcion: string | null;
    servicio_nombre: string | null;
    programada_para: string | null;
    programada_para_manana: boolean;
};

export const programacionService = {
    async listarProgramables(estacionId: number): Promise<{
        data: ActividadProgramable[];
        manana: string;
    }> {
        const token = await getToken();
        const res = await fetch(
            `${BASE_URL}/api/estaciones/${estacionId}/actividades-programables`,
            { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
        );
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');
        return { data: json.data, manana: json.manana };
    },

    async programar(actividadIds: number[], fecha: string): Promise<void> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/actividades/programar`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ actividad_ids: actividadIds, fecha }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');
    },

    async crearActividad(data: {
        nombre: string;
        tipo: string;
        descripcion?: string;
        estacion_servicio_id: number;
        programada_para?: string;
    }): Promise<ActividadProgramable> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/actividades`, {
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
        return json.actividad;
    },
    async listarServicios(estacionId: number): Promise<Array<{ id: number; nombre: string }>> {
        const token = await getToken();
        const res = await fetch(
            `${BASE_URL}/api/estaciones/${estacionId}/servicios`,
            { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
        );
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');
        return json.data;
    },
};