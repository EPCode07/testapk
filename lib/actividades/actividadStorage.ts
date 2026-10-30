import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { ActividadEnCurso, FotoCaptura } from './types';

const KEY = '@actividades_en_curso';

function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

async function leer(): Promise<ActividadEnCurso[]> {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
}

async function escribir(data: ActividadEnCurso[]) {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

function fusionarDuplicados(todas: ActividadEnCurso[]): ActividadEnCurso[] {
    const grupos = new Map<number, ActividadEnCurso[]>();

    for (const act of todas) {
        const key = act.estacionServicioActividadId;
        if (!grupos.has(key)) grupos.set(key, []);
        grupos.get(key)!.push(act);
    }

    const resultado: ActividadEnCurso[] = [];

    for (const [_, acts] of grupos) {
        if (acts.length === 1) {
            resultado.push(acts[0]);
            continue;
        }

        const ordenadas = [...acts].sort((a, b) => b.creadoEn - a.creadoEn);
        const base: ActividadEnCurso = { ...ordenadas[0] };

        const fotosMap = new Map<string, FotoCaptura>();
        for (const act of ordenadas) {
            for (const foto of act.fotos) {
                fotosMap.set(foto.idLocal, foto);
            }
        }
        base.fotos = Array.from(fotosMap.values());

        const exportada = ordenadas.find(
            (a) => a.estado === 'exportada' || a.estado === 'pendiente_subida'
        );
        if (exportada) {
            base.estado = exportada.estado;
            base.exportadoEn = exportada.exportadoEn;
        }

        if (!base.descripcionGeneral) {
            const conDesc = ordenadas.find(
                (a) => (a.descripcionGeneral ?? '').length > 0
            );
            if (conDesc) base.descripcionGeneral = conDesc.descripcionGeneral;
        }

        if (base.conforme == null) {
            const conConf = ordenadas.find((a) => a.conforme != null);
            if (conConf) base.conforme = conConf.conforme;
        }

        resultado.push(base);
    }

    return resultado;
}

export const actividadStorage = {
    async listar(): Promise<ActividadEnCurso[]> {
        const todas = await leer();
        const limpias = fusionarDuplicados(todas);
        if (limpias.length !== todas.length) {
            await escribir(limpias);
        }
        return limpias;
    },

    async listarBorradores(): Promise<ActividadEnCurso[]> {
        const todas = await leer();
        return todas.filter((a) => a.estado === 'borrador');
    },

    async obtener(idLocal: string): Promise<ActividadEnCurso | null> {
        const todas = await leer();
        return todas.find((a) => a.idLocal === idLocal) ?? null;
    },

    async obtenerPorActividadId(
        estacionServicioActividadId: number
    ): Promise<ActividadEnCurso | null> {
        const limpias = await this.listar();
        return (
            limpias.find(
                (a) => a.estacionServicioActividadId === estacionServicioActividadId
            ) ?? null
        );
    },

    async crear(data: {
        estacionServicioActividadId: number;
        proyectoId: number;
        estacionId: number;
        nombreActividad: string;
    }): Promise<ActividadEnCurso> {
        const todas = await leer();

        const existente = todas.find(
            (a) => a.estacionServicioActividadId === data.estacionServicioActividadId
        );

        if (existente) {
            return existente;
        }

        const nueva: ActividadEnCurso = {
            idLocal: uuid(),
            estacionServicioActividadId: data.estacionServicioActividadId,
            proyectoId: data.proyectoId,
            estacionId: data.estacionId,
            nombreActividad: data.nombreActividad,
            estado: 'borrador',
            creadoEn: Date.now(),
            exportadoEn: null,
            fotos: [],
        };

        todas.push(nueva);
        await escribir(todas);
        return nueva;
    },

    async agregarFoto(
        idLocal: string,
        foto: Omit<FotoCaptura, 'idLocal'>
    ): Promise<FotoCaptura | null> {
        const todas = await leer();
        const idx = todas.findIndex((a) => a.idLocal === idLocal);
        if (idx === -1) return null;

        const idFoto = uuid();

        const dirActividad = `${FileSystem.documentDirectory}actividades/${idLocal}/`;
        const info = await FileSystem.getInfoAsync(dirActividad);
        if (!info.exists) {
            await FileSystem.makeDirectoryAsync(dirActividad, { intermediates: true });
        }

        const nombreArchivo = `${idFoto}.jpg`;
        const uriDestino = `${dirActividad}${nombreArchivo}`;

        let uriFinal = foto.uriLocal;
        try {
            await FileSystem.copyAsync({
                from: foto.uriLocal,
                to: uriDestino,
            });
            uriFinal = uriDestino;
        } catch (e) {
            console.warn('⚠️ No se pudo copiar la foto:', e);
        }

        const nuevaFoto: FotoCaptura = {
            ...foto,
            uriLocal: uriFinal,
            idLocal: idFoto,
            subidaAlServidor: false,
        };
        todas[idx].fotos.push(nuevaFoto);
        await escribir(todas);
        return nuevaFoto;
    },
    async actualizarFoto(
        idActividadLocal: string,
        idFotoLocal: string,
        patch: Partial<FotoCaptura>
    ): Promise<void> {
        const todas = await leer();

        // 🔍 RASTREO
        console.log("📂 [STORAGE] Buscando Actividad ID:", idActividadLocal);
        const idx = todas.findIndex((a) => a.idLocal === idActividadLocal);

        if (idx === -1) {
            console.log("❌ [STORAGE] Actividad no encontrada. IDs disponibles:", todas.map(a => a.idLocal));
            return;
        }

        const fotoIdx = todas[idx].fotos.findIndex((f) => f.idLocal === idFotoLocal);
        if (fotoIdx === -1) {
            console.log("❌ [STORAGE] Foto no encontrada. IDs disponibles:", todas[idx].fotos.map(f => f.idLocal));
            return;
        }

        console.log("✅ [STORAGE] Guardando datos exitosamente:", patch);

        todas[idx].fotos[fotoIdx] = {
            ...todas[idx].fotos[fotoIdx],
            ...patch,
        };
        await escribir(todas);
    },

    async eliminarFoto(idActividadLocal: string, idFotoLocal: string): Promise<void> {
        const todas = await leer();
        const idx = todas.findIndex((a) => a.idLocal === idActividadLocal);
        if (idx === -1) return;

        todas[idx].fotos = todas[idx].fotos.filter((f) => f.idLocal !== idFotoLocal);
        await escribir(todas);
    },

    async actualizarDescripcionGeneral(
        idLocal: string,
        descripcion: string,
        conforme?: boolean
    ): Promise<void> {
        const todas = await leer();
        const idx = todas.findIndex((a) => a.idLocal === idLocal);
        if (idx === -1) return;

        todas[idx].descripcionGeneral = descripcion;
        if (conforme !== undefined) {
            todas[idx].conforme = conforme;
        }
        await escribir(todas);
    },

    async marcarExportada(idLocal: string): Promise<void> {
        const todas = await leer();
        const idx = todas.findIndex((a) => a.idLocal === idLocal);
        if (idx === -1) return;

        todas[idx].estado = 'exportada';
        todas[idx].exportadoEn = Date.now();
        await escribir(todas);
    },

    async eliminar(idLocal: string): Promise<void> {
        const todas = await leer();
        await escribir(todas.filter((a) => a.idLocal !== idLocal));
    },

    async limpiarExportadas(): Promise<void> {
        const todas = await leer();
        await escribir(todas.filter((a) => a.estado !== 'exportada'));
    },

    async marcarFotosSubidas(
        idActividadLocal: string,
        idsFotos: string[]
    ): Promise<void> {
        const todas = await leer();
        const idx = todas.findIndex((a) => a.idLocal === idActividadLocal);
        if (idx === -1) return;

        todas[idx].fotos = todas[idx].fotos.map((f) =>
            idsFotos.includes(f.idLocal) ? { ...f, subidaAlServidor: true } : f
        );
        await escribir(todas);
    },

    async limpiarDuplicados(): Promise<number> {
        const todas = await leer();
        const grupos = new Map<number, ActividadEnCurso[]>();

        for (const act of todas) {
            const key = act.estacionServicioActividadId;
            if (!grupos.has(key)) grupos.set(key, []);
            grupos.get(key)!.push(act);
        }

        const limpias: ActividadEnCurso[] = [];
        let eliminados = 0;

        for (const [_, acts] of grupos) {
            if (acts.length === 1) {
                limpias.push(acts[0]);
                continue;
            }

            const ordenadas = [...acts].sort((a, b) => b.creadoEn - a.creadoEn);

            const base = ordenadas[0];

            const fotosMap = new Map<string, any>();
            for (const act of ordenadas) {
                for (const foto of act.fotos) {
                    fotosMap.set(foto.idLocal, foto);
                }
            }
            base.fotos = Array.from(fotosMap.values());

            const exportada = ordenadas.find(
                (a) => a.estado === 'exportada' || a.estado === 'pendiente_subida'
            );
            if (exportada) {
                base.estado = exportada.estado;
                base.exportadoEn = exportada.exportadoEn;
            }

            const conDescripcion = ordenadas.find(
                (a) => (a.descripcionGeneral ?? '').length > 0
            );
            if (conDescripcion && !base.descripcionGeneral) {
                base.descripcionGeneral = conDescripcion.descripcionGeneral;
            }

            const conConforme = ordenadas.find((a) => a.conforme != null);
            if (conConforme && base.conforme == null) {
                base.conforme = conConforme.conforme;
            }

            limpias.push(base);
            eliminados += acts.length - 1;
        }

        await escribir(limpias);
        return eliminados;
    },
};