export type TipoSuceso = 'seguridad_ambiente' | 'condicion_climatica';

export type SucesoCategoria = {
    id: number;
    nombre: string;
    tipo: TipoSuceso;
    unidad: string | null;
    icono: string | null;
    color: string | null;
    activa: boolean;
    es_base: boolean;
    es_sugerida: boolean;
    puede_editar: boolean;
    puede_desactivar: boolean;
    creado_por: number | null;
};

export type Suceso = {
    id: number;
    categoria_id: number;
    categoria_nombre: string;
    categoria_icono: string | null;
    categoria_color: string | null;
    categoria_tipo: TipoSuceso;
    unidad: string | null;
    descripcion: string | null;
    valor: number | null;
    fecha_hora: string;
    latitud: number | null;
    longitud: number | null;
    actividad_id: number | null;
    actividad_nombre: string | null;
    puede_editar: boolean;
    puede_eliminar: boolean;
};

export type SucesoPendiente = {
    idLocal: string;
    categoria_id: number;
    categoria_nombre: string;
    categoria_icono: string | null;
    categoria_color: string | null;
    categoria_tipo: TipoSuceso;
    unidad: string | null;
    descripcion: string | null;
    valor: number | null;
    fecha_hora: string;
    latitud: number | null;
    longitud: number | null;
    estacion_servicio_actividad_id: number | null;
    creadoEn: number;
};