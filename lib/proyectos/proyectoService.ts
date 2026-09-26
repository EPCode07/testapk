import { authService } from '../user/authService';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export type EstadoProyecto =
    | 'iniciar'
    | 'en_progreso'
    | 'retrasada'
    | 'observada'
    | 'completado';

export interface Proyecto {
    id: number;
    codigo: string;
    nombre: string;
    cliente: string;
    ubicacion: string | null;
    estado: EstadoProyecto;
    latitud: number | null;
    longitud: number | null;
    progreso: number;
    estaciones_count: number;
    fecha_inicio: string | null;
    fecha_fin_estimada: string | null;
    foto_url: string | null;
}

export interface ActividadDetalle {
    id: number;
    nombre: string;
    tipo: 'sistema' | 'inspeccion' | 'mantenimiento' | 'tarea';
    estado: 'pendiente' | 'en_progreso' | 'completado' | 'observado';
    conforme: boolean | null;
}

export interface ServicioDetalle {
    id: number;
    nombre: string;
    total_actividades: number;
    actividades: ActividadDetalle[];
}

export interface EstacionDetalle {
    id: number;
    codigo: string;
    nombre: string;
    estado: string;
    progreso: number;
    servicios: ServicioDetalle[];
}

export interface ProyectoDetalle {
    id: number;
    codigo: string;
    nombre: string;
    cliente: string;
    ubicacion: string | null;
    estado: EstadoProyecto;
    progreso: number;
    estaciones: EstacionDetalle[];
}

export const proyectoService = {
    async listar(estado?: string): Promise<Proyecto[]> {
        const token = await authService.getToken();
        if (!token) throw new Error('Sin sesión');

        const url = new URL(`${BASE_URL}/api/proyectos`);
        if (estado && estado !== 'todos') url.searchParams.append('estado', estado);

        const res = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
            throw new Error(json.message ?? 'Error cargando proyectos');
        }

        return json.data;
    },

    async detalle(id: number): Promise<ProyectoDetalle> {
        const token = await authService.getToken();
        if (!token) throw new Error('Sin sesión');

        const res = await fetch(`${BASE_URL}/api/proyectos/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
            throw new Error(json.message ?? 'Error cargando el proyecto');
        }

        return json.data;
    },
};