import { supervisoresStorage } from '../exportaciones/supervisoresStorage';
import { authService } from '../user/authService';
import { proyectoCache } from './proyectoCache';


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
    tipo: 'sistema' | 'inspeccion' | 'mantenimiento' | 'tarea' | 'observacion';
    estado: 'pendiente' | 'en_progreso' | 'completado' | 'observado';
    conforme: boolean | null;
}

export interface ServicioDetalle {
    id: number;
    nombre: string;
    total_actividades: number;
    actividades: ActividadDetalle[];
}


export interface SupervisorExterno {
    id: number;
    nombre_completo: string;
    nombre: string;
    apellidos: string | null;
    dni: string | null;
    cargo: string | null;
    activo: boolean;
    asignado_en: string | null;
}


export interface EstacionDetalle {
    id: number;
    codigo: string;
    nombre: string;
    estado: string;
    progreso: number;
    supervisores_externos?: SupervisorExterno[];
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

export interface SupervisoresEstacionResponse {
    disponibles: SupervisorExterno[];
    asignados: number[];
}

export const proyectoService = {
    async listar(estado?: string): Promise<Proyecto[]> {
        try {
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

            await proyectoCache.guardarLista(json.data);
            return json.data;
        } catch (err) {
            const cached = await proyectoCache.leerLista();

            if (cached) return cached;
            throw err;
        }
    },

    async detalle(id: number): Promise<ProyectoDetalle> {
        try {
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

            await proyectoCache.guardarDetalle(id, json.data);
            return json.data;
        } catch (err) {
            const cached = await proyectoCache.leerDetalle(id);
            if (cached) return cached;
            throw err;
        }
    },


    async obtenerSupervisores(estacionId: number): Promise<SupervisoresEstacionResponse> {
        try {
            const token = await authService.getToken();
            if (!token) throw new Error('Sin sesión');

            const res = await fetch(`${BASE_URL}/api/estaciones/${estacionId}/supervisores`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            if (!res.ok) throw new Error('Error del servidor');

            const json = await res.json();
            const data = json.data ?? json;

            await proyectoCache.guardarSupervisoresCache(estacionId, data);
            return data;
        } catch (err) {
            const cached = await proyectoCache.leerSupervisoresCache(estacionId);

            if (cached) {
                return cached;
            }

            return { disponibles: [], asignados: [] };
        }
    },
    async guardarSupervisores(estacionId: number, supervisoresIds: number[]): Promise<{ success: boolean; offline: boolean }> {
        try {
            const token = await authService.getToken();
            if (!token) throw new Error('Sin sesión');

            const res = await fetch(`${BASE_URL}/api/estaciones/${estacionId}/supervisores`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ supervisores_ids: supervisoresIds }),
            });

            if (!res.ok) throw new Error('Error del servidor');

            const cached = await proyectoCache.leerSupervisoresCache(estacionId);
            if (cached) {
                cached.asignados = supervisoresIds;
                await proyectoCache.guardarSupervisoresCache(estacionId, cached);
            }

            return { success: true, offline: false };
        } catch (err) {
            await supervisoresStorage.encolar(estacionId, supervisoresIds);

            const cached = await proyectoCache.leerSupervisoresCache(estacionId);
            if (cached) {
                cached.asignados = supervisoresIds;
                await proyectoCache.guardarSupervisoresCache(estacionId, cached);
            }

            return { success: true, offline: true };
        }
    },
};