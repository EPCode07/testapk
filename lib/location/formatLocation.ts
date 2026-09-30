/**
 * Convierte -12.0820 → "12.0820S"
 *          -77.1035 → "77.1035W"
 *          12.5     → "12.5000N"
 */
export function formatCoord(value: number, axis: 'lat' | 'lng'): string {
    const abs = Math.abs(value).toFixed(4);
    let suffix = '';
    if (axis === 'lat') suffix = value >= 0 ? 'N' : 'S';
    else suffix = value >= 0 ? 'E' : 'W';
    return `${abs}${suffix}`;
}

/**
 * Convierte 83.85 → "N 84°" (o NE, E, SE, S, SW, W, NW)
 */
export function formatHeading(deg: number | null | undefined): string {
    if (deg == null) return '--';
    const cardinales = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(deg / 45) % 8;
    return `${cardinales[idx]} ${Math.round(deg)}°`;
}

/**
 * Convierte "2026-09-26T22:35:00Z" → { fecha: "26/09/26", hora: "10:35 pm" }
 */
export function formatFechaHora(iso: string): { fecha: string; hora: string } {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');

    const fecha = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;

    let h = d.getHours();
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    const hora = `${h}:${pad(d.getMinutes())} ${ampm}`;

    return { fecha, hora };
}