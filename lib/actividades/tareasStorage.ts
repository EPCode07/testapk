import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@tareas_observacion_pendientes';

export interface TareaPendiente {
    id: string;
    proyectoId: number;
    estacionId: number;
    estacionServicioId: number;
    nombre: string;
    descripcion: string;
    creadoEn: number;
    seleccionada: number;
    es_extra: number;
}

async function leer(): Promise<TareaPendiente[]> {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
}

async function escribir(data: TareaPendiente[]) {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export const tareasStorage = {
    async listar(): Promise<TareaPendiente[]> {
        return leer();
    },

    async encolar(tarea: Omit<TareaPendiente, 'id' | 'creadoEn' | 'seleccionada' | 'es_extra'>): Promise<void> {
        const todas = await leer();

        const esDuplicadoReciente = todas.some(t =>
            t.estacionServicioId === tarea.estacionServicioId &&
            t.nombre === tarea.nombre &&
            (Date.now() - t.creadoEn) < 3000
        );
        if (esDuplicadoReciente) return;

        todas.push({
            ...tarea,
            id: Math.random().toString(36).substring(7),
            creadoEn: Date.now(),
            seleccionada: 1,
            es_extra: 0
        });

        await escribir(todas);
    },

    async eliminar(id: string): Promise<void> {
        const todas = await leer();
        await escribir(todas.filter(t => t.id !== id));
    },

    async limpiar(): Promise<void> {
        await AsyncStorage.removeItem(KEY);
    }
};