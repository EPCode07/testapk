import AsyncStorage from '@react-native-async-storage/async-storage';
import { Proyecto, ProyectoDetalle } from './proyectoService';

const LISTA_KEY = '@proyectos_lista_cache';
const DETALLE_KEY = (id: number) => `@proyecto_detalle_${id}`;
const META_KEY = '@proyectos_cache_meta';

type CacheEntry<T> = {
    data: T;
    ts: number;
};

export type CacheMetadata = {
    ultimaActualizacion: number | null;
    totalProyectos: number;
    totalEstaciones: number;
    totalActividades: number;
    totalSupervisores: number;
};

export const proyectoCache = {
    async guardarLista(proyectos: Proyecto[]): Promise<void> {
        const entry: CacheEntry<Proyecto[]> = { data: proyectos, ts: Date.now() };
        await AsyncStorage.setItem(LISTA_KEY, JSON.stringify(entry));
    },

    async leerLista(): Promise<Proyecto[] | null> {
        try {
            const raw = await AsyncStorage.getItem(LISTA_KEY);
            if (!raw) return null;
            const entry: CacheEntry<Proyecto[]> = JSON.parse(raw);
            return entry.data;
        } catch {
            return null;
        }
    },

    async guardarDetalle(id: number, detalle: ProyectoDetalle): Promise<void> {
        const entry: CacheEntry<ProyectoDetalle> = { data: detalle, ts: Date.now() };
        await AsyncStorage.setItem(DETALLE_KEY(id), JSON.stringify(entry));
    },

    async leerDetalle(id: number): Promise<ProyectoDetalle | null> {
        try {
            const raw = await AsyncStorage.getItem(DETALLE_KEY(id));
            if (!raw) return null;
            const entry: CacheEntry<ProyectoDetalle> = JSON.parse(raw);
            return entry.data;
        } catch {
            return null;
        }
    },

    async guardarMetadata(meta: CacheMetadata): Promise<void> {
        await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
    },

    async leerMetadata(): Promise<CacheMetadata | null> {
        try {
            const raw = await AsyncStorage.getItem(META_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    },

    async hayCache(): Promise<boolean> {
        const lista = await this.leerLista();
        return lista !== null && lista.length > 0;
    },

    async limpiar(): Promise<void> {
        const keys = await AsyncStorage.getAllKeys();
        const projectKeys = keys.filter(
            (k) =>
                k === LISTA_KEY ||
                k === META_KEY ||
                k.startsWith('@proyecto_detalle_')
        );
        if (projectKeys.length > 0) {
            await AsyncStorage.multiRemove(projectKeys);
        }
    },
};