import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { actividadStorage } from './actividadStorage';
import { ActividadEnCurso, FotoCaptura } from './types';

export type ActividadResumen = {
    id: number;
    nombre: string;
    tipo: 'sistema' | 'inspeccion' | 'mantenimiento' | 'tarea';
    estado: 'pendiente' | 'en_progreso' | 'completado' | 'observado';
    conforme: boolean | null;
};

type ContextValue = {
    proyectoId: number | null;
    proyectoNombre: string | null;
    estacionId: number | null;
    estacionCodigo: string | null;
    actividades: ActividadResumen[];
    actividadActualId: number | null;
    actividadActual: ActividadResumen | null;

    actividadEnCurso: ActividadEnCurso | null;
    cargandoActividad: boolean;

    seed: (data: {
        proyectoId: number;
        proyectoNombre: string;
        estacionId: number;
        estacionCodigo: string;
        actividades: ActividadResumen[];
        actividadActualId: number;
    }) => void;

    setActividadActual: (id: number) => Promise<void>;
    addActividad: (act: ActividadResumen) => void;
    clear: () => void;

    cargarActividadEnCurso: (actividadId: number) => Promise<void>;
    agregarFotoActividad: (foto: Omit<FotoCaptura, 'idLocal'>) => Promise<void>;
    actualizarFoto: (idFotoLocal: string, patch: Partial<FotoCaptura>) => Promise<void>;
    eliminarFoto: (idFotoLocal: string) => Promise<void>;
    actualizarDescripcionGeneral: (descripcion: string, conforme?: boolean) => Promise<void>;
    marcarExportada: () => Promise<void>;
    descartarActividadEnCurso: () => Promise<void>;
    transferirFotosAActividad: (
        nuevaActividadId: number
    ) => Promise<ActividadEnCurso | undefined>;
    marcarFotosSubidas: (idsFotos: string[]) => Promise<void>;   // 👈 nuevo

};

const Ctx = createContext<ContextValue | null>(null);

export function ActividadProvider({ children }: { children: ReactNode }) {
    const [proyectoId, setProyectoId] = useState<number | null>(null);
    const [proyectoNombre, setProyectoNombre] = useState<string | null>(null);
    const [estacionId, setEstacionId] = useState<number | null>(null);
    const [estacionCodigo, setEstacionCodigo] = useState<string | null>(null);
    const [actividades, setActividades] = useState<ActividadResumen[]>([]);
    const [actividadActualId, setActividadActualId] = useState<number | null>(null);

    const [actividadEnCurso, setActividadEnCurso] = useState<ActividadEnCurso | null>(null);
    const [cargandoActividad, setCargandoActividad] = useState(false);

    // 🔑 Refs para evitar closures obsoletos
    const actividadEnCursoRef = useRef<ActividadEnCurso | null>(null);
    const proyectoIdRef = useRef<number | null>(null);
    const estacionIdRef = useRef<number | null>(null);
    const actividadesRef = useRef<ActividadResumen[]>([]);

    useEffect(() => {
        // 🔑 Limpieza de duplicados al arrancar
        actividadStorage.limpiarDuplicados().then((eliminados) => {
            if (eliminados > 0) {
                console.log(`🧹 ${eliminados} actividades duplicadas eliminadas`);
            }
        });
    }, []);



    // Sincronizar refs con state
    useEffect(() => {
        actividadEnCursoRef.current = actividadEnCurso;
    }, [actividadEnCurso]);

    useEffect(() => {
        proyectoIdRef.current = proyectoId;
    }, [proyectoId]);

    useEffect(() => {
        estacionIdRef.current = estacionId;
    }, [estacionId]);

    useEffect(() => {
        actividadesRef.current = actividades;
    }, [actividades]);

    // Helper para actualizar ambos (state + ref) sincrónicamente
    const setActividadEnCursoSync = useCallback((nueva: ActividadEnCurso | null) => {
        actividadEnCursoRef.current = nueva;
        setActividadEnCurso(nueva);
    }, []);

    // ============ Navegación ============

    const seed = useCallback((data: {
        proyectoId: number;
        proyectoNombre: string;
        estacionId: number;
        estacionCodigo: string;
        actividades: ActividadResumen[];
        actividadActualId: number;
    }) => {
        setProyectoId(data.proyectoId);
        setProyectoNombre(data.proyectoNombre);
        setEstacionId(data.estacionId);
        setEstacionCodigo(data.estacionCodigo);
        setActividades(data.actividades);
        setActividadActualId(data.actividadActualId);
    }, []);

    const setActividadActual = useCallback(async (id: number) => {
        setActividadActualId(id);

        const pId = proyectoIdRef.current;
        const eId = estacionIdRef.current;
        const acts = actividadesRef.current;

        if (pId && eId) {
            const act = acts.find((a) => a.id === id);
            if (act) {
                await actividadStorage.crear({
                    estacionServicioActividadId: id,
                    proyectoId: pId,
                    estacionId: eId,
                    nombreActividad: act.nombre,
                });
                const enCurso = await actividadStorage.obtenerPorActividadId(id);
                setActividadEnCursoSync(enCurso);
            }
        }
    }, [setActividadEnCursoSync]);

    const addActividad = useCallback((act: ActividadResumen) => {
        setActividades((prev) => [...prev, act]);
    }, []);

    const clear = useCallback(() => {
        setProyectoId(null);
        setProyectoNombre(null);
        setEstacionId(null);
        setEstacionCodigo(null);
        setActividades([]);
        setActividadActualId(null);
        setActividadEnCursoSync(null);
    }, [setActividadEnCursoSync]);

    // ============ Actividad en curso ============

    const cargarActividadEnCurso = useCallback(async (actividadId: number) => {
        setCargandoActividad(true);
        try {
            let act = await actividadStorage.obtenerPorActividadId(actividadId);

            const pId = proyectoIdRef.current;
            const eId = estacionIdRef.current;
            const acts = actividadesRef.current;

            if (!act && pId && eId) {
                const nombreAct = acts.find((a) => a.id === actividadId)?.nombre ?? 'Actividad';
                act = await actividadStorage.crear({
                    estacionServicioActividadId: actividadId,
                    proyectoId: pId,
                    estacionId: eId,
                    nombreActividad: nombreAct,
                });
            }

            setActividadEnCursoSync(act);
        } finally {
            setCargandoActividad(false);
        }
    }, [setActividadEnCursoSync]);

    const agregarFotoActividad = useCallback(
        async (foto: Omit<FotoCaptura, 'idLocal'>) => {
            // 🔑 Leer del ref, no del closure
            const actual = actividadEnCursoRef.current;
            if (!actual) return;

            const nueva = await actividadStorage.agregarFoto(actual.idLocal, foto);
            if (nueva) {
                const updated = {
                    ...actual,
                    fotos: [...actual.fotos, nueva],
                };
                setActividadEnCursoSync(updated);
            }
        },
        [setActividadEnCursoSync]
    );

    const actualizarFoto = useCallback(
        async (idFotoLocal: string, patch: Partial<FotoCaptura>) => {
            const actual = actividadEnCursoRef.current;
            if (!actual) return;

            await actividadStorage.actualizarFoto(actual.idLocal, idFotoLocal, patch);
            const updated = {
                ...actual,
                fotos: actual.fotos.map((f) =>
                    f.idLocal === idFotoLocal ? { ...f, ...patch } : f
                ),
            };
            setActividadEnCursoSync(updated);
        },
        [setActividadEnCursoSync]
    );

    const eliminarFoto = useCallback(
        async (idFotoLocal: string) => {
            const actual = actividadEnCursoRef.current;
            if (!actual) return;

            await actividadStorage.eliminarFoto(actual.idLocal, idFotoLocal);
            const updated = {
                ...actual,
                fotos: actual.fotos.filter((f) => f.idLocal !== idFotoLocal),
            };
            setActividadEnCursoSync(updated);
        },
        [setActividadEnCursoSync]
    );

    const marcarFotosSubidas = useCallback(
        async (idsFotos: string[]) => {
            const actual = actividadEnCursoRef.current;
            if (!actual) return;

            await actividadStorage.marcarFotosSubidas(actual.idLocal, idsFotos);

            // Actualizar state + ref
            const updated = {
                ...actual,
                fotos: actual.fotos.map((f) =>
                    idsFotos.includes(f.idLocal) ? { ...f, subidaAlServidor: true } : f
                ),
            };
            setActividadEnCursoSync(updated);
        },
        [setActividadEnCursoSync]
    );
    const actualizarDescripcionGeneral = useCallback(
        async (descripcion: string, conforme?: boolean) => {
            const actual = actividadEnCursoRef.current;
            if (!actual) return;

            await actividadStorage.actualizarDescripcionGeneral(
                actual.idLocal,
                descripcion,
                conforme
            );
            const updated = {
                ...actual,
                descripcionGeneral: descripcion,
                conforme: conforme ?? actual.conforme,
            };
            setActividadEnCursoSync(updated);
        },
        [setActividadEnCursoSync]
    );

    const marcarExportada = useCallback(async () => {
        const actual = actividadEnCursoRef.current;
        if (!actual) return;

        await actividadStorage.marcarExportada(actual.idLocal);
        const updated = {
            ...actual,
            estado: 'exportada' as const,
            exportadoEn: Date.now(),
        };
        setActividadEnCursoSync(updated);
    }, [setActividadEnCursoSync]);

    const descartarActividadEnCurso = useCallback(async () => {
        const actual = actividadEnCursoRef.current;
        if (!actual) return;

        await actividadStorage.eliminar(actual.idLocal);
        setActividadEnCursoSync(null);
    }, [setActividadEnCursoSync]);

    const transferirFotosAActividad = useCallback(
        async (nuevaActividadId: number) => {
            const actual = actividadEnCursoRef.current;
            if (!actual) return;

            const borradorOrigenLocalId = actual.idLocal;
            const fotosOrigen = [...actual.fotos];

            const pId = proyectoIdRef.current;
            const eId = estacionIdRef.current;
            const acts = actividadesRef.current;

            const actDestino = acts.find((a) => a.id === nuevaActividadId);
            if (!actDestino || !pId || !eId) return;

            let borradorDestino = await actividadStorage.obtenerPorActividadId(
                nuevaActividadId
            );

            if (!borradorDestino) {
                borradorDestino = await actividadStorage.crear({
                    estacionServicioActividadId: nuevaActividadId,
                    proyectoId: pId,
                    estacionId: eId,
                    nombreActividad: actDestino.nombre,
                });
            }

            // Copiar fotos al borrador destino
            for (const foto of fotosOrigen) {
                await actividadStorage.agregarFoto(borradorDestino.idLocal, {
                    uriLocal: foto.uriLocal,
                    timestamp: foto.timestamp,
                    heading: foto.heading,
                    latitud: foto.latitud,
                    longitud: foto.longitud,
                    altitud: foto.altitud,
                    precision: foto.precision,
                    descripcionIndividual: foto.descripcionIndividual,
                    direccion: foto.direccion,
                    ubicacionTexto: foto.ubicacionTexto,
                });
            }

            // Eliminar el borrador origen
            await actividadStorage.eliminar(borradorOrigenLocalId);

            // Actualizar state + ref
            const borradorDestinoActualizado =
                await actividadStorage.obtenerPorActividadId(nuevaActividadId);

            setActividadActualId(nuevaActividadId);
            setActividadEnCursoSync(borradorDestinoActualizado);

            return borradorDestinoActualizado ?? undefined;
        },
        [setActividadEnCursoSync]
    );

    // ============ Derivados ============

    const actividadActual = actividades.find((a) => a.id === actividadActualId) ?? null;

    return (
        <Ctx.Provider
            value={{
                proyectoId,
                proyectoNombre,
                estacionId,
                estacionCodigo,
                actividades,
                actividadActualId,
                actividadActual,
                actividadEnCurso,
                cargandoActividad,
                seed,
                setActividadActual,
                addActividad,
                clear,
                cargarActividadEnCurso,
                agregarFotoActividad,
                actualizarFoto,
                eliminarFoto,
                actualizarDescripcionGeneral,
                marcarExportada,
                descartarActividadEnCurso,
                transferirFotosAActividad,
                marcarFotosSubidas,

            }}
        >
            {children}
        </Ctx.Provider>
    );
}

export function useActividad() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useActividad debe usarse dentro de <ActividadProvider>');
    return ctx;
}