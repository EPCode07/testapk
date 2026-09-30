import { CacheMetadata, proyectoCache } from './proyectoCache';
import { Proyecto, proyectoService } from './proyectoService';

export type PasoDescarga = {
    id: 'proyectos' | 'estaciones' | 'actividades' | 'supervisores' | 'guardando';
    label: string;
    icono: string;
    estado: 'pendiente' | 'en_progreso' | 'completado' | 'error';
    detalle?: string;
    cantidad?: number;
};

export type ProgresoDescarga = {
    pasos: PasoDescarga[];
    porcentaje: number;
    completado: boolean;
    error: string | null;
};

export type DescargaResultado = {
    success: boolean;
    meta: CacheMetadata | null;
    error: string | null;
};

const PASOS_INICIALES: PasoDescarga[] = [
    { id: 'proyectos', label: 'Obteniendo proyectos...', icono: '📥', estado: 'pendiente' },
    { id: 'estaciones', label: 'Obteniendo estaciones...', icono: '📍', estado: 'pendiente' },
    { id: 'actividades', label: 'Obteniendo actividades...', icono: '📋', estado: 'pendiente' },
    { id: 'supervisores', label: 'Obteniendo supervisores...', icono: '👥', estado: 'pendiente' },
    { id: 'guardando', label: 'Guardando localmente...', icono: '💾', estado: 'pendiente' },
];

/**
 * Descarga toda la data de proyectos + estaciones + actividades + supervisores
 * y la guarda en caché. Reporta el progreso mediante callback.
 */
export async function descargarTodo(
    onProgress: (progreso: ProgresoDescarga) => void
): Promise<DescargaResultado> {
    let pasos: PasoDescarga[] = PASOS_INICIALES.map((p) => ({ ...p }));

    // ---- Cálculo de porcentaje mejorado ----
    // Cada paso vale 1 punto; "en_progreso" vale 0.5 para que la barra avance.
    const calcularPorcentaje = (): number => {
        const puntos = pasos.reduce((acc, p) => {
            if (p.estado === 'completado') return acc + 1;
            if (p.estado === 'en_progreso') return acc + 0.5;
            return acc;
        }, 0);
        return Math.round((puntos / pasos.length) * 100);
    };

    const emitir = (error: string | null = null) => {
        const porcentaje = calcularPorcentaje();
        onProgress({
            pasos: pasos.map((p) => ({ ...p })),
            porcentaje,
            completado: pasos.every((p) => p.estado === 'completado'),
            error,
        });
    };

    const marcarPaso = (
        id: PasoDescarga['id'],
        estado: PasoDescarga['estado'],
        detalle?: string,
        cantidad?: number
    ) => {
        pasos = pasos.map((p) =>
            p.id === id ? { ...p, estado, detalle, cantidad } : p
        );
    };

    try {
        emitir();

        // ==========================================================
        // PASO 1: Lista de proyectos
        // ==========================================================
        marcarPaso('proyectos', 'en_progreso');
        emitir();

        let proyectos: Proyecto[];
        try {
            proyectos = await proyectoService.listar();
        } catch (e: any) {
            marcarPaso('proyectos', 'error', e?.message ?? 'Error al listar proyectos');
            emitir(e?.message ?? 'Error al listar proyectos');
            return {
                success: false,
                meta: null,
                error: e?.message ?? 'Error al listar proyectos',
            };
        }

        marcarPaso('proyectos', 'completado', `${proyectos.length} encontrados`, proyectos.length);
        emitir();

        if (proyectos.length === 0) {
            marcarPaso('estaciones', 'completado', '0 encontradas', 0);
            marcarPaso('actividades', 'completado', '0 encontradas', 0);
            marcarPaso('supervisores', 'completado', '0 encontrados', 0);
            emitir();
        }

        // ==========================================================
        // PASO 2-4: Detalle de cada proyecto
        // ==========================================================
        let totalEstaciones = 0;
        let totalActividades = 0;
        let totalSupervisores = 0;
        const proyectosConError: number[] = [];

        if (proyectos.length > 0) {
            // Marcar los tres pasos como en progreso al inicio
            marcarPaso('estaciones', 'en_progreso', `0/${proyectos.length} proyectos`);
            marcarPaso('actividades', 'en_progreso', `0/${proyectos.length} proyectos`);
            marcarPaso('supervisores', 'en_progreso', `0/${proyectos.length} proyectos`);
            emitir();
        }

        for (let i = 0; i < proyectos.length; i++) {
            const p = proyectos[i];

            try {
                const detalle = await proyectoService.detalle(p.id);

                const estacionesCount = detalle.estaciones?.length ?? 0;
                totalEstaciones += estacionesCount;

                let actividadesCount = 0;
                let supervisoresCount = 0;

                detalle.estaciones?.forEach((est) => {
                    // Actividades
                    est.servicios?.forEach((s) => {
                        actividadesCount += s.actividades?.length ?? 0;
                    });

                    // 🔑 Supervisores externos viven en la ESTACIÓN, no en el proyecto
                    const sups = (est as any).supervisores_externos;
                    if (Array.isArray(sups)) {
                        supervisoresCount += sups.length;
                    }
                });

                totalActividades += actividadesCount;
                totalSupervisores += supervisoresCount;
            } catch (e: any) {
                console.warn(`⚠️ Error procesando proyecto ${p.id}:`, e?.message);
                proyectosConError.push(p.id);
            }

            // 🔑 Actualizar progreso UNA vez por proyecto (no 3)
            const detalle = `${i + 1}/${proyectos.length} proyectos procesados`;
            marcarPaso('estaciones', 'en_progreso', detalle, totalEstaciones);
            marcarPaso('actividades', 'en_progreso', detalle, totalActividades);
            marcarPaso('supervisores', 'en_progreso', detalle, totalSupervisores);
            emitir();
        }

        // Marcar los 3 pasos como completados
        const huboErrores = proyectosConError.length > 0;
        const sufijoErrores = huboErrores
            ? ` (${proyectosConError.length} con error)`
            : '';

        marcarPaso(
            'estaciones',
            'completado',
            `${totalEstaciones} encontradas${sufijoErrores}`,
            totalEstaciones
        );
        marcarPaso(
            'actividades',
            'completado',
            `${totalActividades} encontradas${sufijoErrores}`,
            totalActividades
        );
        marcarPaso(
            'supervisores',
            'completado',
            `${totalSupervisores} encontrados${sufijoErrores}`,
            totalSupervisores
        );
        emitir();

        // ==========================================================
        // PASO 5: Guardar metadata
        // ==========================================================
        marcarPaso('guardando', 'en_progreso');
        emitir();

        const meta: CacheMetadata = {
            ultimaActualizacion: Date.now(),
            totalProyectos: proyectos.length,
            totalEstaciones,
            totalActividades,
            totalSupervisores,
        };

        await proyectoCache.guardarMetadata(meta);
        marcarPaso('guardando', 'completado', 'Datos guardados');
        emitir();

        return { success: true, meta, error: null };
    } catch (err: any) {
        const msg = err?.message ?? 'Error desconocido';

        // Marcar como error todos los pasos que estén "en_progreso" o "pendiente"
        pasos = pasos.map((p) =>
            p.estado === 'en_progreso' || p.estado === 'pendiente'
                ? { ...p, estado: 'error', detalle: msg }
                : p
        );
        emitir(msg);

        return { success: false, meta: null, error: msg };
    }
}