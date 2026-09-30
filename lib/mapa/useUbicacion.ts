import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Coordenada {
    latitud: number;
    longitud: number;
    precision?: number;
    altitud?: number | null;
}

export interface DireccionInfo {
    nombre: string;        // "Cajamarca, Perú" o "Av. X 123"
    calle?: string | null;
    ciudad?: string | null;
    region?: string | null;
    pais?: string | null;
    codigoPostal?: string | null;
}

interface EstadoUbicacion {
    ubicacion: Coordenada | null;
    direccion: DireccionInfo | null;
    permiso: 'pendiente' | 'concedido' | 'denegado';
    cargando: boolean;
    error: string | null;
    seguirUbicacion: boolean;
}

export function useUbicacion(autoStart = false) {
    const [estado, setEstado] = useState<EstadoUbicacion>({
        ubicacion: null,
        direccion: null,
        permiso: 'pendiente',
        cargando: false,
        error: null,
        seguirUbicacion: autoStart,
    });

    const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

    /**
     * Reverse geocoding: obtiene la dirección a partir de lat/lng.
     */
    const obtenerDireccion = useCallback(async (lat: number, lng: number): Promise<DireccionInfo | null> => {
        try {
            const results = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lng,
            });

            if (!results || results.length === 0) return null;

            const r = results[0];

            // Construir un nombre legible
            const partes = [
                r.street,
                r.district,
                r.city,
                r.region,
                r.country,
            ].filter(Boolean);

            return {
                nombre: partes.slice(0, 3).join(', ') || 'Sin dirección',
                calle: r.street,
                ciudad: r.city,
                region: r.region,
                pais: r.country,
                codigoPostal: r.postalCode,
            };
        } catch (error) {
            console.warn('Error en reverse geocoding:', error);
            return null;
        }
    }, []);

    /**
     * Pedir permisos.
     */
    const pedirPermiso = useCallback(async (): Promise<boolean> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status === 'granted') {
                setEstado((e) => ({ ...e, permiso: 'concedido', error: null }));
                return true;
            }

            setEstado((e) => ({
                ...e,
                permiso: 'denegado',
                error: 'Permiso de ubicación denegado',
            }));
            return false;
        } catch (error: any) {
            setEstado((e) => ({
                ...e,
                error: error.message ?? 'Error al pedir permiso',
            }));
            return false;
        }
    }, []);

    /**
     * Obtener la ubicación actual + dirección.
     */
    const obtenerUbicacionActual = useCallback(async (): Promise<Coordenada | null> => {
        setEstado((e) => ({ ...e, cargando: true, error: null }));

        try {
            const tienePermiso = await pedirPermiso();
            if (!tienePermiso) {
                setEstado((e) => ({ ...e, cargando: false }));
                return null;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const coords: Coordenada = {
                latitud: location.coords.latitude,
                longitud: location.coords.longitude,
                precision: location.coords.accuracy ?? undefined,
                altitud: location.coords.altitude ?? null,
            };

            setEstado((e) => ({ ...e, ubicacion: coords }));

            // Obtener dirección en background
            const dir = await obtenerDireccion(coords.latitud, coords.longitud);
            setEstado((e) => ({ ...e, direccion: dir, cargando: false }));

            return coords;
        } catch (error: any) {
            setEstado((e) => ({
                ...e,
                cargando: false,
                error: error.message ?? 'Error al obtener ubicación',
            }));
            return null;
        }
    }, [pedirPermiso, obtenerDireccion]);

    /**
     * Seguimiento en tiempo real.
     */
    const empezarSeguimiento = useCallback(async () => {
        try {
            const tienePermiso = await pedirPermiso();
            if (!tienePermiso) return;

            if (subscriptionRef.current) {
                subscriptionRef.current.remove();
            }

            setEstado((e) => ({ ...e, seguirUbicacion: true, cargando: true }));

            subscriptionRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: 10,
                },
                async (location) => {
                    const coords: Coordenada = {
                        latitud: location.coords.latitude,
                        longitud: location.coords.longitude,
                        precision: location.coords.accuracy ?? undefined,
                        altitud: location.coords.altitude ?? null,
                    };

                    setEstado((e) => ({ ...e, ubicacion: coords, cargando: false }));

                    // Actualizar dirección solo cada vez que cambia la ubicación significativamente
                    const dir = await obtenerDireccion(coords.latitud, coords.longitud);
                    setEstado((e) => ({ ...e, direccion: dir }));
                }
            );
        } catch (error: any) {
            setEstado((e) => ({
                ...e,
                cargando: false,
                error: error.message ?? 'Error al iniciar seguimiento',
            }));
        }
    }, [pedirPermiso, obtenerDireccion]);

    const detenerSeguimiento = useCallback(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.remove();
            subscriptionRef.current = null;
        }
        setEstado((e) => ({ ...e, seguirUbicacion: false }));
    }, []);

    useEffect(() => {
        if (autoStart) {
            obtenerUbicacionActual();
        }

        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.remove();
            }
        };
    }, [autoStart, obtenerUbicacionActual]);

    return {
        ...estado,
        pedirPermiso,
        obtenerUbicacionActual,
        empezarSeguimiento,
        detenerSeguimiento,
    };
}