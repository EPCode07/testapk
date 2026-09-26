/**
 * Calcula la distancia en metros entre 2 puntos usando la fórmula de Haversine.
 */
export function calcularDistancia(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371000; // Radio de la Tierra en metros
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Encuentra el punto más cercano de una lista.
 * Devuelve null si ninguno está dentro del rango.
 */
export function encontrarMasCercano<T extends { latitud: number; longitud: number }>(
    origen: { latitud: number; longitud: number },
    puntos: T[],
    radioMetros: number
): { punto: T; distancia: number } | null {
    let masCercano: { punto: T; distancia: number } | null = null;

    for (const p of puntos) {
        const d = calcularDistancia(origen.latitud, origen.longitud, p.latitud, p.longitud);
        if (d <= radioMetros && (!masCercano || d < masCercano.distancia)) {
            masCercano = { punto: p, distancia: d };
        }
    }

    return masCercano;
}