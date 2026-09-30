import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExportacionItem } from './types';

const KEY = '@exportaciones_pendientes';

function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

async function leer(): Promise<ExportacionItem[]> {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
}

async function escribir(data: ExportacionItem[]) {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export const exportacionesStorage = {
    async listar(): Promise<ExportacionItem[]> {
        return leer();
    },

    async listarPendientes(): Promise<ExportacionItem[]> {
        const todas = await leer();
        return todas.filter((e) => e.estado === 'pendiente' || e.estado === 'error');
    },

    async obtener(id: string): Promise<ExportacionItem | null> {
        const todas = await leer();
        return todas.find((e) => e.id === id) ?? null;
    },

    async obtenerPorActividad(actividadLocalId: string): Promise<ExportacionItem | null> {
        const todas = await leer();
        return todas.find((e) => e.actividadLocalId === actividadLocalId) ?? null;
    },

    async encolar(data: {
        actividadLocalId: string;
        estacionServicioActividadId: number;
        estacionId: number;
        proyectoId: number;
        totalFotos: number;
    }): Promise<ExportacionItem> {
        const todas = await leer();

        // Evitar duplicados
        const existente = todas.find((e) => e.actividadLocalId === data.actividadLocalId);
        if (existente) return existente;

        const nueva: ExportacionItem = {
            id: uuid(),
            actividadLocalId: data.actividadLocalId,
            estacionServicioActividadId: data.estacionServicioActividadId,
            estacionId: data.estacionId,
            proyectoId: data.proyectoId,
            totalFotos: data.totalFotos,
            intentos: 0,
            ultimoIntento: null,
            ultimoError: null,
            creadoEn: Date.now(),
            estado: 'pendiente',
        };

        todas.push(nueva);
        await escribir(todas);
        return nueva;
    },

    async marcarError(id: string, mensaje: string): Promise<void> {
        const todas = await leer();
        const idx = todas.findIndex((e) => e.id === id);
        if (idx === -1) return;

        todas[idx].intentos += 1;
        todas[idx].ultimoIntento = Date.now();
        todas[idx].ultimoError = mensaje;
        todas[idx].estado = 'error';
        await escribir(todas);
    },

    async marcarPendiente(id: string): Promise<void> {
        const todas = await leer();
        const idx = todas.findIndex((e) => e.id === id);
        if (idx === -1) return;

        todas[idx].estado = 'pendiente';
        todas[idx].ultimoError = null;
        await escribir(todas);
    },

    async eliminar(id: string): Promise<void> {
        const todas = await leer();
        await escribir(todas.filter((e) => e.id !== id));
    },

    async limpiar(): Promise<void> {
        await escribir([]);
    },
};