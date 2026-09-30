import AsyncStorage from '@react-native-async-storage/async-storage';
import { SucesoPendiente } from './types';


const QUEUE_KEY = '@sucesos_pendientes';
const CATEGORIAS_KEY = '@categorias_pendientes';


function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export type CategoriaPendiente = {
    idTemporal: number;
    nombre: string;
    tipo: 'seguridad_ambiente' | 'condicion_climatica';
    unidad: string | null;
    icono: string | null;
    color: string | null;
    creadoEn: number;
};

async function leerCategoriasPendientes(): Promise<CategoriaPendiente[]> {
    const raw = await AsyncStorage.getItem(CATEGORIAS_KEY);
    return raw ? JSON.parse(raw) : [];
}

async function escribirCategoriasPendientes(data: CategoriaPendiente[]) {
    await AsyncStorage.setItem(CATEGORIAS_KEY, JSON.stringify(data));
}


async function leer(): Promise<SucesoPendiente[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
}

async function escribir(data: SucesoPendiente[]) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(data));
}

export const sucesosStorage = {
    async listar(): Promise<SucesoPendiente[]> {
        return leer();
    },

    async contar(): Promise<number> {
        return (await leer()).length;
    },

    async encolar(data: Omit<SucesoPendiente, 'idLocal' | 'creadoEn'>): Promise<SucesoPendiente> {
        const cola = await leer();
        const item: SucesoPendiente = {
            ...data,
            idLocal: uuid(),
            creadoEn: Date.now(),
        };
        cola.push(item);
        await escribir(cola);
        return item;
    },

    async eliminar(idLocal: string): Promise<void> {
        const cola = await leer();
        await escribir(cola.filter((s) => s.idLocal !== idLocal));
    },

    async limpiar(): Promise<void> {
        await escribir([]);
    },

    async listarCategoriasPendientes(): Promise<CategoriaPendiente[]> {
        return leerCategoriasPendientes();
    },

    /**
  * Crea una categoría local con ID temporal negativo.
  */
    async encolarCategoria(data: {
        nombre: string;
        tipo: 'seguridad_ambiente' | 'condicion_climatica';
        unidad: string | null;
    }): Promise<CategoriaPendiente> {
        const pendientes = await leerCategoriasPendientes();

        // Generar un ID temporal único (negativo)
        const minId = pendientes.length > 0
            ? Math.min(...pendientes.map((c) => c.idTemporal))
            : 0;
        const idTemporal = minId - 1;

        const nueva: CategoriaPendiente = {
            idTemporal,
            nombre: data.nombre,
            tipo: data.tipo,
            unidad: data.unidad,
            icono: 'alert-circle',
            color: '#6B7280',
            creadoEn: Date.now(),
        };

        pendientes.push(nueva);
        await escribirCategoriasPendientes(pendientes);
        return nueva;
    },

    async eliminarCategoriaPendiente(idTemporal: number): Promise<void> {
        const pendientes = await leerCategoriasPendientes();
        await escribirCategoriasPendientes(
            pendientes.filter((c) => c.idTemporal !== idTemporal)
        );
    },

    /**
     * Actualiza el ID temporal de una categoría en los sucesos pendientes.
     * Se llama después de sincronizar una categoría.
     */
    async remapearCategoriaEnSucesos(
        idTemporal: number,
        idReal: number
    ): Promise<void> {
        const cola = await leer();
        let cambiado = false;

        for (const s of cola) {
            if (s.categoria_id === idTemporal) {
                s.categoria_id = idReal;
                cambiado = true;
            }
        }

        if (cambiado) await escribir(cola);
    },

};