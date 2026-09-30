export type EstadoExportacion = 'pendiente' | 'error';

export type ExportacionItem = {
    id: string;                        // uuid local de la cola
    actividadLocalId: string;          // idLocal en actividades_en_curso
    estacionServicioActividadId: number;
    estacionId: number;
    proyectoId: number;
    totalFotos: number;
    intentos: number;
    ultimoIntento: number | null;
    ultimoError: string | null;
    creadoEn: number;
    estado: EstadoExportacion;
};