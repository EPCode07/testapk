import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { SeleccionContexto } from '../../components/sucesos/ProyectoEstacionActividadSelector';
import { sucesoService } from './sucesoService';
import { sucesosStorage } from './sucesoStorage';
import { Suceso, SucesoCategoria, SucesoPendiente } from './types';



const ULTIMO_CONTEXTO_KEY = '@sucesos_ultimo_contexto';

type ContextValue = {
    categorias: SucesoCategoria[];
    sucesosHoy: Suceso[];
    pendientes: SucesoPendiente[];
    cargando: boolean;
    refrescarCategorias: () => Promise<void>;
    refrescarSucesos: () => Promise<void>;
    crearSuceso: (data: {
        categoria_id: number;
        descripcion?: string;
        valor?: number;
        estacion_servicio_actividad_id?: number;
        latitud?: number;
        longitud?: number;
        categoriaSnapshot?: SucesoCategoria;
    }) => Promise<{ success: boolean; offline: boolean; suceso?: Suceso }>;
    actualizarSuceso: (id: number, data: any) => Promise<void>;
    eliminarSuceso: (id: number) => Promise<void>;
    crearCategoria: (data: {
        nombre: string;
        tipo: string;
        unidad?: string;
    }) => Promise<SucesoCategoria>;
    sincronizarPendientes: () => Promise<void>;
    ultimoContexto: SeleccionContexto | null;
    setUltimoContexto: (ctx: SeleccionContexto) => Promise<void>;
};

const Ctx = createContext<ContextValue | null>(null);

function hoyLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}



export function SucesosProvider({ children }: { children: ReactNode }) {
    const [categorias, setCategorias] = useState<SucesoCategoria[]>([]);
    const [sucesosHoy, setSucesosHoy] = useState<Suceso[]>([]);
    const [pendientes, setPendientes] = useState<SucesoPendiente[]>([]);
    const [cargando, setCargando] = useState(false);
    const syncingPendientesRef = useRef(false);
    const wasOnlineRef = useRef(true);
    const [ultimoContexto, setUltimoContextoState] = useState<SeleccionContexto | null>(null);


    const refrescarCategorias = useCallback(async () => {
        try {
            const data = await sucesoService.listarCategorias();
            setCategorias(data);
        } catch (err) {
            console.warn('Error cargando categorías:', err);
        }
    }, []);

    const refrescarSucesos = useCallback(async () => {
        setCargando(true);
        try {
            const data = await sucesoService.listarPorFecha(hoyLocal());
            setSucesosHoy(data);
        } catch (err) {
            console.warn('Error cargando sucesos:', err);
        } finally {
            setCargando(false);
        }
    }, []);

    const refrescarPendientes = useCallback(async () => {
        const data = await sucesosStorage.listar();
        setPendientes(data);
    }, []);


    const sincronizarPendientes = useCallback(async () => {
        if (syncingPendientesRef.current) return;
        syncingPendientesRef.current = true;

        try {
            const net = await NetInfo.fetch();
            if (!net.isConnected || net.isInternetReachable === false) return;

            // ============================================================
            // PASO 1: Sincronizar categorías pendientes
            // ============================================================
            const catPendientes = await sucesosStorage.listarCategoriasPendientes();

            if (catPendientes.length > 0) {
                console.log(`📡 Sincronizando ${catPendientes.length} categorías...`);

                for (const cat of catPendientes) {
                    try {
                        // Enviar al server
                        const res = await sucesoService.crearCategoria({
                            nombre: cat.nombre,
                            tipo: cat.tipo,
                            unidad: cat.unidad ?? undefined,
                        });

                        // Remapear el ID temporal al real en los sucesos pendientes
                        await sucesosStorage.remapearCategoriaEnSucesos(
                            cat.idTemporal,
                            res.categoria.id
                        );

                        // Eliminar de la cola de categorías
                        await sucesosStorage.eliminarCategoriaPendiente(cat.idTemporal);

                        console.log(`✅ Categoría "${cat.nombre}" creada en server con ID ${res.categoria.id}`);
                    } catch (err: any) {
                        console.warn(`⚠️ No se pudo subir categoría "${cat.nombre}":`, err?.message);
                    }
                }

                await refrescarCategorias();
            }

            // ============================================================
            // PASO 2: Sincronizar sucesos pendientes
            // ============================================================
            const cola = await sucesosStorage.listar();
            if (cola.length === 0) {
                await refrescarPendientes();
                return;
            }

            console.log(`📡 Sincronizando ${cola.length} sucesos pendientes...`);

            let ok = 0;
            let fail = 0;

            for (const item of cola) {
                try {
                    await sucesoService.crear({
                        categoria_id: item.categoria_id,
                        descripcion: item.descripcion ?? undefined,
                        valor: item.valor ?? undefined,
                        estacion_servicio_actividad_id: item.estacion_servicio_actividad_id ?? undefined,
                        latitud: item.latitud ?? undefined,
                        longitud: item.longitud ?? undefined,
                        fecha_hora: item.fecha_hora,
                    });
                    await sucesosStorage.eliminar(item.idLocal);
                    ok++;
                } catch (err: any) {
                    fail++;
                    console.warn(`⚠️ No se pudo subir suceso ${item.idLocal}:`, err?.message);
                    if (err?.message?.includes('fetch') || err?.message?.includes('network')) {
                        break;
                    }
                }
            }

            console.log(`✅ Sincronización: ${ok} subidos, ${fail} fallidos`);
            await refrescarPendientes();
            await refrescarSucesos();
        } finally {
            syncingPendientesRef.current = false;
        }
    }, [refrescarCategorias, refrescarPendientes, refrescarSucesos]);




    const crearSuceso = useCallback(
        async (data: {
            categoria_id: number;
            descripcion?: string;
            valor?: number;
            estacion_servicio_actividad_id?: number;
            latitud?: number;
            longitud?: number;
            categoriaSnapshot?: SucesoCategoria;
        }): Promise<{ success: boolean; offline: boolean; suceso?: Suceso }> => {
            const fechaHora = new Date().toISOString();

            // 🔑 PASO 1: Verificar red ANTES de intentar fetch
            const net = await NetInfo.fetch();
            const isOnline = !!net.isConnected && net.isInternetReachable !== false;

            // Si no hay red, encolar directamente sin intentar fetch
            if (!isOnline) {
                console.log('📴 Sin conexión, encolando suceso localmente');
                const cat = data.categoriaSnapshot;
                await sucesosStorage.encolar({
                    categoria_id: data.categoria_id,
                    categoria_nombre: cat?.nombre ?? 'Sin categoría',
                    categoria_icono: cat?.icono ?? null,
                    categoria_color: cat?.color ?? null,
                    categoria_tipo: cat?.tipo ?? 'seguridad_ambiente',
                    unidad: cat?.unidad ?? null,
                    descripcion: data.descripcion ?? null,
                    valor: data.valor ?? null,
                    fecha_hora: fechaHora,
                    latitud: data.latitud ?? null,
                    longitud: data.longitud ?? null,
                    estacion_servicio_actividad_id:
                        data.estacion_servicio_actividad_id ?? null,
                });
                await refrescarPendientes();
                return { success: true, offline: true };
            }

            // 🔑 PASO 2: Hay red, intentar enviar
            try {
                const creado = await sucesoService.crear({
                    categoria_id: data.categoria_id,
                    descripcion: data.descripcion,
                    valor: data.valor,
                    estacion_servicio_actividad_id: data.estacion_servicio_actividad_id,
                    latitud: data.latitud,
                    longitud: data.longitud,
                    fecha_hora: fechaHora,
                });
                await refrescarSucesos();
                return { success: true, offline: false, suceso: creado };
            } catch (err: any) {
                // Falló a pesar de tener red → encolar como fallback
                console.warn('⚠️ Falló la subida, encolando localmente:', err?.message);
                const cat = data.categoriaSnapshot;
                await sucesosStorage.encolar({
                    categoria_id: data.categoria_id,
                    categoria_nombre: cat?.nombre ?? 'Sin categoría',
                    categoria_icono: cat?.icono ?? null,
                    categoria_color: cat?.color ?? null,
                    categoria_tipo: cat?.tipo ?? 'seguridad_ambiente',
                    unidad: cat?.unidad ?? null,
                    descripcion: data.descripcion ?? null,
                    valor: data.valor ?? null,
                    fecha_hora: fechaHora,
                    latitud: data.latitud ?? null,
                    longitud: data.longitud ?? null,
                    estacion_servicio_actividad_id:
                        data.estacion_servicio_actividad_id ?? null,
                });
                await refrescarPendientes();
                return { success: true, offline: true };
            }
        },
        [refrescarSucesos, refrescarPendientes]
    );

    const actualizarSuceso = useCallback(
        async (id: number, data: any) => {
            await sucesoService.actualizar(id, data);
            await refrescarSucesos();
        },
        [refrescarSucesos]
    );

    const eliminarSuceso = useCallback(
        async (id: number) => {
            await sucesoService.eliminar(id);
            await refrescarSucesos();
        },
        [refrescarSucesos]
    );

    const crearCategoria = useCallback(
        async (data: { nombre: string; tipo: string; unidad?: string }): Promise<SucesoCategoria> => {
            // 🔑 Verificar red ANTES del fetch
            const net = await NetInfo.fetch();
            const isOnline = !!net.isConnected && net.isInternetReachable !== false;

            if (isOnline) {
                try {
                    const res = await sucesoService.crearCategoria(data);
                    await refrescarCategorias();
                    return res.categoria;
                } catch (err: any) {
                    console.warn('⚠️ Falló crear categoría online, encolando:', err?.message);
                    // Caer al modo offline
                }
            }

            // 🔑 Modo offline: crear localmente con ID temporal
            console.log('📴 Creando categoría offline');
            const pendiente = await sucesosStorage.encolarCategoria({
                nombre: data.nombre,
                tipo: data.tipo as 'seguridad_ambiente' | 'condicion_climatica',
                unidad: data.unidad ?? null,
            });

            // Construir un objeto SucesoCategoria "virtual" con ID negativo
            const categoriaLocal: SucesoCategoria = {
                id: pendiente.idTemporal,
                nombre: pendiente.nombre,
                tipo: pendiente.tipo,
                unidad: pendiente.unidad,
                icono: pendiente.icono,
                color: pendiente.color,
                activa: true,
                es_base: false,
                es_sugerida: true,
                puede_editar: true,
                puede_desactivar: true,
                creado_por: null,
            };

            // Añadir a la lista local para que aparezca en el selector
            setCategorias((prev) => [...prev, categoriaLocal]);

            return categoriaLocal;
        },
        [refrescarCategorias]
    );

    useEffect(() => {
        refrescarCategorias();
        refrescarSucesos();
        refrescarPendientes();

        const unsubscribe = NetInfo.addEventListener(async (state) => {
            const isNowOnline = !!state.isConnected && state.isInternetReachable !== false;

            // Solo sincronizar cuando pasa de offline → online
            if (isNowOnline && !wasOnlineRef.current) {
                console.log('🌐 Conexión recuperada, sincronizando...');
                await sincronizarPendientes();
            }

            wasOnlineRef.current = isNowOnline;
        });

        return () => unsubscribe();
    }, [refrescarCategorias, refrescarSucesos, refrescarPendientes, sincronizarPendientes]);

    useEffect(() => {
        AsyncStorage.getItem(ULTIMO_CONTEXTO_KEY).then((raw) => {
            if (raw) {
                try {
                    setUltimoContextoState(JSON.parse(raw));
                } catch { }
            }
        });
    }, []);

    const setUltimoContexto = useCallback(async (ctx: SeleccionContexto) => {
        setUltimoContextoState(ctx);
        await AsyncStorage.setItem(ULTIMO_CONTEXTO_KEY, JSON.stringify(ctx));
    }, []);


    return (
        <Ctx.Provider
            value={{
                categorias,
                sucesosHoy,
                pendientes,
                cargando,
                refrescarCategorias,
                refrescarSucesos,
                crearSuceso,
                actualizarSuceso,
                eliminarSuceso,
                crearCategoria,
                sincronizarPendientes,
                ultimoContexto,
                setUltimoContexto,
            }}
        >
            {children}
        </Ctx.Provider>
    );
}

export function useSucesos() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useSucesos debe usarse dentro de <SucesosProvider>');
    return ctx;
}