export type EstadoActividad = 'borrador' | 'pendiente_subida' | 'exportada' | 'error';


export type ActividadEnCurso = {
    idLocal: string;
    estacionServicioActividadId: number;
    proyectoId: number;
    estacionId: number;
    nombreActividad: string;
    descripcionGeneral?: string;
    conforme?: boolean;
    estado: EstadoActividad;   // 👈 tipo ampliado
    creadoEn: number;
    exportadoEn: number | null;
    intentosSubida?: number;   // 👈 nuevo: para backoff
    ultimoErrorSubida?: string | null;   // 👈 nuevo
    fotos: FotoCaptura[];
};

export type FotoCaptura = {
    idLocal: string;
    uriLocal: string;
    descripcionIndividual?: string;
    latitud?: number;
    longitud?: number;
    altitud?: number;
    precision?: number;
    heading?: number | null;
    timestamp: string;
    direccion?: string;
    ubicacionTexto?: string;
    subidaAlServidor?: boolean;   // 👈 NUEVO
};