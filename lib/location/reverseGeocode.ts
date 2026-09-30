import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const CACHE_KEY = '@reverse_geocode_cache';
const PRECISION_GRID = 3; // ~100m de precisión para reutilizar caché

export type DireccionInfo = {
    nombre: string;
    distrito: string;
};

type CacheItem = DireccionInfo & { ts: number };
type Cache = Record<string, CacheItem>;

function gridKey(lat: number, lng: number): string {
    return `${lat.toFixed(PRECISION_GRID)},${lng.toFixed(PRECISION_GRID)}`;
}

export async function obtenerDireccion(
    lat: number,
    lng: number,
): Promise<DireccionInfo | null> {
    const key = gridKey(lat, lng);

    // 1. Buscar en caché
    try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
            const cache: Cache = JSON.parse(raw);
            const hit = cache[key];
            if (hit) {
                return { nombre: hit.nombre, distrito: hit.distrito };
            }
        }
    } catch (e) {
        console.warn('⚠️ Error leyendo caché de direcciones:', e);
    }

    // 2. Consultar al servicio
    try {
        const [result] = await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lng,
        });

        if (!result) return null;

        const info: DireccionInfo = {
            nombre:
                result.name ||
                result.street ||
                result.streetNumber + ' ' + result.street ||
                result.city ||
                'Sin nombre',
            distrito:
                result.district ||
                result.subregion ||
                result.city ||
                result.region ||
                '',
        };

        // 3. Guardar en caché
        try {
            const raw = await AsyncStorage.getItem(CACHE_KEY);
            const cache: Cache = raw ? JSON.parse(raw) : {};
            cache[key] = { ...info, ts: Date.now() };
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch { }

        return info;
    } catch (e) {
        console.warn('⚠️ Error reverse geocoding:', e);
        return null;
    }
}