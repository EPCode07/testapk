// lib/actividades/exportarSeguro.ts
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function esDeadlock(e: unknown) {
    const msg = String((e as Error)?.message ?? e);
    return msg.includes('HTTP 500') &&
        (msg.includes('1213') || msg.includes('Deadlock') || msg.includes('40001'));
}

async function conReintento<T>(fn: () => Promise<T>, intentos = 3): Promise<T> {
    for (let i = 0; ; i++) {
        try {
            return await fn();
        } catch (e) {
            if (!esDeadlock(e) || i >= intentos - 1) throw e;
            await sleep(400 * 2 ** i + Math.random() * 200); // backoff con jitter
        }
    }
}

// Si ya hay una exportación en curso para ese id, reutiliza la misma promesa
const enCurso = new Map<number, Promise<unknown>>();

export function exportarUnaVez<T>(id: number, fn: () => Promise<T>): Promise<T> {
    const actual = enCurso.get(id);
    if (actual) return actual as Promise<T>;

    const p = conReintento(fn).finally(() => enCurso.delete(id));
    enCurso.set(id, p);
    return p;
}