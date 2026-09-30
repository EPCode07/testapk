import { actividadStorage } from '../actividades/actividadStorage';
import { FotoCaptura } from '../actividades/types';
import { Proyecto, proyectoService } from '../proyectos/proyectoService';
import { authService } from '../user/authService';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// ============================================================
// Tipos
// ============================================================
export interface FotoGaleria extends FotoCaptura {
    proyectoId: number;
    estacionId: number;
    actividadNombre: string;
    creadoEn: number;


    // 🔑 nuevos (solo presentes cuando vienen del backend)
    userId?: number;
    esMia?: boolean;
    autorNombre?: string;
}

export interface ProyectoGaleriaItem {
    id: number;
    codigo: string;
    nombre: string;
    cliente: string;
    totalFotos: number;
    ultimaFotoUri: string | null;
    ultimoRegistroTimestamp: number | null;
    tiempoRelativo: string;
}

export interface EstacionGaleriaItem {
    id: number;
    codigo: string;
    nombre: string;
    totalFotos: number;
    fotosPreview: FotoGaleria[];
}

export interface GrupoFechaFotos {
    titulo: string;
    fechaClave: string;
    totalFotos: number;
    fotos: FotoGaleria[];
}

// ============================================================
// Helpers
// ============================================================
async function getTokenOrThrow() {
    const token = await authService.getToken();
    if (!token) throw new Error('Sin sesión');
    return token;
}

async function apiGet<T>(path: string): Promise<T> {
    const token = await getTokenOrThrow();
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
        },
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
        throw new Error(json.message ?? `Error en ${path}`);
    }
    return json.data as T;
}

function formatTiempoRelativo(timestampMs: number | null): string {
    if (!timestampMs) return 'Sin fotos';
    const ahora = Date.now();
    const diffMin = Math.floor((ahora - timestampMs) / (1000 * 60));
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} d`;
    return `Hace ${Math.floor(diffDias / 7)} sem`;
}

function formatearClaveFecha(fechaStr: string | number): { clave: string; titulo: string } {
    const fecha = new Date(fechaStr);
    const ahora = new Date();
    const hoyClave = ahora.toISOString().slice(0, 10);
    const ayerDate = new Date();
    ayerDate.setDate(ahora.getDate() - 1);
    const ayerClave = ayerDate.toISOString().slice(0, 10);

    const clave = isNaN(fecha.getTime()) ? hoyClave : fecha.toISOString().slice(0, 10);

    if (clave === hoyClave) return { clave, titulo: 'Hoy' };
    if (clave === ayerClave) return { clave, titulo: 'Ayer' };

    const titulo = isNaN(fecha.getTime())
        ? 'Fecha desconocida'
        : fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

    return { clave, titulo };
}

// ============================================================
// Servicio
// ============================================================
export const galeriaService = {
    // ----------------------------------------------------------
    // Local (fallback)
    // ----------------------------------------------------------
    async obtenerTodasLasFotos(): Promise<FotoGaleria[]> {
        const actividades = await actividadStorage.listar();
        const fotos: FotoGaleria[] = [];
        for (const act of actividades) {
            for (const f of act.fotos) {
                fotos.push({
                    ...f,
                    proyectoId: act.proyectoId,
                    estacionId: act.estacionId,
                    actividadNombre: act.nombreActividad,
                    creadoEn: act.creadoEn,
                });
            }
        }
        return fotos.sort((a, b) => {
            const tA = new Date(a.timestamp).getTime() || a.creadoEn || 0;
            const tB = new Date(b.timestamp).getTime() || b.creadoEn || 0;
            return tB - tA;
        });
    },

    // ----------------------------------------------------------
    // Backend
    // ----------------------------------------------------------
    async obtenerProyectosServidor(): Promise<ProyectoGaleriaItem[]> {
        const data = await apiGet<any[]>('/api/galeria/proyectos');
        return (data ?? []).map((p) => {
            const ts = p.ultima_captura ? new Date(p.ultima_captura).getTime() : null;
            return {
                id: p.id,
                codigo: p.codigo,
                nombre: p.nombre,
                cliente: p.cliente ?? '',
                totalFotos: p.total_fotos ?? 0,
                ultimaFotoUri: p.foto_preview ?? null,
                ultimoRegistroTimestamp: ts,
                tiempoRelativo: p.rango_fotos ?? formatTiempoRelativo(ts),
            };
        });
    },

    async obtenerEstacionesServidor(proyectoId: number): Promise<EstacionGaleriaItem[]> {
        const data = await apiGet<any[]>(`/api/galeria/proyecto/${proyectoId}`);
        return (data ?? []).map((e) => ({
            id: e.id,
            codigo: e.codigo,
            nombre: e.nombre,
            totalFotos: e.total_fotos ?? 0,
            // El backend devuelve solo URLs; las envolvemos en FotoGaleria mínimo
            fotosPreview: (e.previews ?? []).map((url: string, i: number) => ({
                idLocal: `remote-${e.id}-${i}`,
                uriLocal: url,
                descripcionIndividual: '',
                timestamp: new Date().toISOString(),
                proyectoId,
                estacionId: e.id,
                actividadNombre: '',
                creadoEn: Date.now(),
                subidaAlServidor: true,
            })),
        }));
    },

    async obtenerFotosDeEstacionServidor(
        estacionId: number,
        soloCompartidas = false
    ): Promise<GrupoFechaFotos[]> {
        const tab = soloCompartidas ? 'compartidas' : 'local';
        const data = await apiGet<any[]>(`/api/galeria/estacion/${estacionId}?tab=${tab}`);

        return (data ?? []).map((g) => ({
            titulo: g.fecha_legible,
            fechaClave: g.fecha,
            totalFotos: g.fotos?.length ?? 0,
            fotos: (g.fotos ?? []).map((f: any): FotoGaleria => ({
                idLocal: String(f.id),
                uriLocal: f.url,
                descripcionIndividual: f.descripcion ?? '',
                latitud: f.latitud ?? undefined,
                longitud: f.longitud ?? undefined,
                timestamp: f.fecha_captura ?? new Date().toISOString(),
                proyectoId: 0, // el endpoint no lo devuelve
                estacionId,
                actividadNombre: '', // el endpoint no lo devuelve
                creadoEn: new Date(f.fecha_captura ?? Date.now()).getTime(),
                subidaAlServidor: true,
                // 🔑 nuevos (solo presentes cuando vienen del backend)
                userId: f.user_id,
                esMia: !!f.es_mia,
                autorNombre: f.autor_nombre,
            })),
        }));
    },

    // ----------------------------------------------------------
    // API pública con fallback
    // ----------------------------------------------------------
    async listarProyectosConFotos(): Promise<ProyectoGaleriaItem[]> {
        try {
            return await this.obtenerProyectosServidor();
        } catch (err) {

            const [proyectos, fotos] = await Promise.all([
                proyectoService.listar().catch(() => [] as Proyecto[]),
                this.obtenerTodasLasFotos(),
            ]);

            return proyectos.map((p) => {
                const fotosProyecto = fotos.filter((f) => f.proyectoId === p.id);
                const ultima = fotosProyecto[0] ?? null;
                const ts = ultima ? new Date(ultima.timestamp).getTime() || ultima.creadoEn : null;
                return {
                    id: p.id,
                    codigo: p.codigo,
                    nombre: p.nombre,
                    cliente: p.cliente,
                    totalFotos: fotosProyecto.length,
                    ultimaFotoUri: ultima ? ultima.uriLocal : p.foto_url ?? null,
                    ultimoRegistroTimestamp: ts,
                    tiempoRelativo: formatTiempoRelativo(ts),
                };
            });
        }
    },

    async listarEstacionesDeProyecto(proyectoId: number): Promise<{
        proyecto: { id: number; nombre: string; codigo: string };
        estaciones: EstacionGaleriaItem[];
    }> {
        try {
            const [estaciones, detalle] = await Promise.all([
                this.obtenerEstacionesServidor(proyectoId),
                proyectoService.detalle(proyectoId),
            ]);
            return {
                proyecto: {
                    id: detalle.id,
                    nombre: detalle.nombre,
                    codigo: detalle.codigo,
                },
                estaciones,
            };
        } catch (err) {

            const [detalleProyecto, fotos] = await Promise.all([
                proyectoService.detalle(proyectoId),
                this.obtenerTodasLasFotos(),
            ]);

            const estaciones: EstacionGaleriaItem[] = (detalleProyecto.estaciones ?? []).map((est) => {
                const fotosEstacion = fotos.filter(
                    (f) => f.proyectoId === proyectoId && f.estacionId === est.id
                );
                return {
                    id: est.id,
                    codigo: est.codigo,
                    nombre: est.nombre,
                    totalFotos: fotosEstacion.length,
                    fotosPreview: fotosEstacion.slice(0, 4),
                };
            });

            return {
                proyecto: {
                    id: detalleProyecto.id,
                    nombre: detalleProyecto.nombre,
                    codigo: detalleProyecto.codigo,
                },
                estaciones,
            };
        }
    },

    async listarFotosDeEstacionPorFecha(
        estacionId: number,
        soloCompartidas = false
    ): Promise<GrupoFechaFotos[]> {
        try {
            return await this.obtenerFotosDeEstacionServidor(estacionId, soloCompartidas);
        } catch (err) {

            const todas = await this.obtenerTodasLasFotos();
            const fotos = soloCompartidas
                ? todas.filter((f) => f.estacionId === estacionId && !!f.subidaAlServidor)
                : todas.filter((f) => f.estacionId === estacionId);

            const mapaGrupos = new Map<string, GrupoFechaFotos>();
            for (const foto of fotos) {
                const { clave, titulo } = formatearClaveFecha(foto.timestamp || foto.creadoEn);
                if (!mapaGrupos.has(clave)) {
                    mapaGrupos.set(clave, { titulo, fechaClave: clave, totalFotos: 0, fotos: [] });
                }
                const g = mapaGrupos.get(clave)!;
                g.fotos.push(foto);
                g.totalFotos++;
            }
            return Array.from(mapaGrupos.values()).sort((a, b) =>
                b.fechaClave.localeCompare(a.fechaClave)
            );
        }
    },

    /** @deprecated usar listarFotosDeEstacionPorFecha */
    async obtenerFotosCompartidasServidor(estacionId: number): Promise<FotoGaleria[]> {
        const grupos = await this.obtenerFotosDeEstacionServidor(estacionId, true);
        return grupos.flatMap((g) => g.fotos);
    },
};