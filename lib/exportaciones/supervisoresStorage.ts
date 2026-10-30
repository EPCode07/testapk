import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@supervisores_pendientes_sync';

export interface SupervisorSyncItem {
    id: string;
    estacionId: number;
    supervisoresIds: number[];
    creadoEn: number;
}

async function leer(): Promise<SupervisorSyncItem[]> {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
}

async function escribir(data: SupervisorSyncItem[]) {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export const supervisoresStorage = {
    async listarPendientes(): Promise<SupervisorSyncItem[]> {
        return leer();
    },

    async encolar(estacionId: number, supervisoresIds: number[]): Promise<void> {
        const todas = await leer();

        const filtradas = todas.filter(x => x.estacionId !== estacionId);

        filtradas.push({
            id: Math.random().toString(36).substring(7),
            estacionId,
            supervisoresIds,
            creadoEn: Date.now()
        });

        await escribir(filtradas);
    },

    async eliminar(id: string): Promise<void> {
        const todas = await leer();
        await escribir(todas.filter(x => x.id !== id));
    }
};