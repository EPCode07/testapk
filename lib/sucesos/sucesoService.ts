import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../user/authService';
import { Suceso, SucesoCategoria } from './types';


const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const CACHE_CATEGORIAS = '@cache_categorias_sucesos';

async function getToken() {
    const token = await authService.getToken();
    if (!token) throw new Error('Sin sesión');
    return token;
}

export const sucesoService = {
    // =================================================================
    // CATEGORÍAS
    // =================================================================

    async listarCategorias(usarCache = true): Promise<SucesoCategoria[]> {
        try {
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/api/sucesos/categorias`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');

            // Guardar en caché
            await AsyncStorage.setItem(CACHE_CATEGORIAS, JSON.stringify(json.data));
            return json.data;
        } catch (err) {
            if (usarCache) {
                const cached = await AsyncStorage.getItem(CACHE_CATEGORIAS);
                if (cached) return JSON.parse(cached);
            }
            throw err;
        }
    },

    async crearCategoria(data: {
        nombre: string;
        tipo: string;
        unidad?: string;
    }): Promise<{ categoria: SucesoCategoria; ya_existia: boolean }> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/sucesos/categorias`, {
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
        return { categoria: json.categoria, ya_existia: json.ya_existia };
    },

    async actualizarCategoria(id: number, data: Partial<SucesoCategoria>): Promise<SucesoCategoria> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/sucesos/categorias/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');
        return json.categoria;
    },

    async desactivarCategoria(id: number): Promise<void> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/sucesos/categorias/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');
    },

    // =================================================================
    // SUCESOS
    // =================================================================

    async listarPorFecha(fecha: string): Promise<Suceso[]> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/sucesos?fecha=${fecha}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');
        return json.data;
    },

    async crear(data: {
        categoria_id: number;
        descripcion?: string;
        valor?: number;
        estacion_servicio_actividad_id?: number;
        latitud?: number;
        longitud?: number;
        fecha_hora?: string;
    }): Promise<Suceso> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/sucesos`, {
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
        return json.suceso;
    },

    async actualizar(
        id: number,
        data: { categoria_id?: number; descripcion?: string; valor?: number }
    ): Promise<Suceso> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/sucesos/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');
        return json.suceso;
    },

    async eliminar(id: number): Promise<void> {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/sucesos/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? 'Error');
    },
};