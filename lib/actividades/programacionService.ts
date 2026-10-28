import { SugerenciaAvance } from "@/components/AvanceSheet";
import { authService } from "../user/authService";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

async function getToken() {
  const token = await authService.getToken();
  if (!token) throw new Error("Sin sesión");
  return token;
}

export type ActividadProgramable = {
  id: number;
  nombre: string;
  tipo: string;
  estado: string;
  descripcion: string | null;
  servicio_nombre: string | null;
  programada_para: string | null;
  programada_para_manana: boolean;
  es_extra?: boolean;
};

export const programacionService = {
  async listarProgramables(estacionId: number): Promise<{
    data: ActividadProgramable[];
    extras: ActividadProgramable[];
    manana: string;
  }> {
    const token = await getToken();
    const res = await fetch(
      `${BASE_URL}/api/estaciones/${estacionId}/actividades-programables`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message ?? "Error al listar actividades");
    return { data: json.data, extras: json.extras ?? [], manana: json.manana };
  },

  async programar(actividadIds: number[], fecha: string): Promise<void> {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}/api/actividades/programar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ actividad_ids: actividadIds, fecha }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message ?? "Error al programar");
  },

  async crearActividad(data: {
    nombre: string;
    tipo: string;
    descripcion?: string;
    estacion_servicio_id: number;
    programada_para?: string;
  }): Promise<ActividadProgramable> {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}/api/actividades`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message ?? "Error al crear actividad");

    return json.actividad;
  },

  async listarServicios(
    estacionId: number,
  ): Promise<{ id: number; nombre: string }[]> {
    const token = await getToken();
    const res = await fetch(
      `${BASE_URL}/api/estaciones/${estacionId}/servicios`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message ?? "Error al listar servicios");
    return json.data;
  },

  async sugerenciaAvance(actividadId: number): Promise<SugerenciaAvance> {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}/api/actividades/${actividadId}/avance-sugerido`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message ?? 'Error al obtener sugerencia');
    return json;
  },

  async registrarAvance(actividadId: number, p: { avance?: number; completar?: boolean }): Promise<void> {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}/api/actividades/${actividadId}/avance`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(p),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message ?? 'Error al registrar avance');
  },
};