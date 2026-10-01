import * as Crypto from 'expo-crypto';
import { pbkdf2 } from 'react-native-quick-crypto';
import {
    clearAuthUser,
    clearStoredCred,
    clearToken,
    getAuthUser,
    getLastOnline,
    getStoredCred,
    getToken,
    setAuthUser,
    setLastOnlineNow,
    setStoredCred,
    setToken,
} from './userStorage';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const MAX_OFFLINE_MS = 7 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10000;

// Si el servidor responde 5xx o algo inesperado, ¿permitir entrar offline?
const OFFLINE_ON_SERVER_ERROR = false;

const CRED_VERSION = 2;
const KDF_ITERATIONS = 210_000;
const KDF_KEYLEN = 32;

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    personal_id: number | null;
    area_id: number | null;
    area: string | null;
    personal: {
        nombres: string;
        apellidos: string;
        cargo: string;
        foto: string | null;
        telefono: string | null;
    } | null;
    roles: string[];
    permissions: string[];
}

// ---------- Errores ----------
/** El teléfono no pudo contactar al servidor (DNS, sin red, timeout). */
class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

/** El servidor respondió, pero algo inesperado (5xx, HTML, respuesta no JSON). */
class ServerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ServerError';
    }
}

// ---------- Helpers ----------
function toHex(bytes: Uint8Array): string {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(): string {
    return toHex(Crypto.getRandomBytes(16));
}

function hashPassword(password: string, salt: string, iterations: number): Promise<string> {
    return new Promise((resolve, reject) => {
        pbkdf2(password, salt, iterations, KDF_KEYLEN, 'sha512', (err, key) => {
            if (err || !key) return reject(err ?? new Error('PBKDF2 falló'));
            resolve(toHex(new Uint8Array(key as unknown as ArrayBufferLike)));
        });
    });
}

/** Comparación en tiempo constante */
function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

/**
 * Petición con timeout.
 * - Fallo de transporte o timeout  → NetworkError
 * - 5xx o cuerpo que no es JSON    → ServerError
 */
async function request(
    path: string,
    init: RequestInit = {}
): Promise<{ res: Response; json: any }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    let text: string;
    try {
        res = await fetch(`${BASE_URL}${path}`, { ...init, signal: ctrl.signal });
        text = await res.text(); // se lee el cuerpo mientras el timeout sigue activo
    } catch (e: any) {
        throw new NetworkError(e?.message ?? 'Sin conexión');
    } finally {
        clearTimeout(timer);
    }

    if (res.status >= 500) {
        throw new ServerError(`Servidor no disponible (${res.status})`);
    }

    let json: any;
    try {
        json = JSON.parse(text);
    } catch {
        if (__DEV__) {
            console.warn(
                '[request] Respuesta no JSON. status =', res.status,
                '| path =', path,
                '| body =', JSON.stringify(text.slice(0, 200))
            );
        }
        throw new ServerError(`Respuesta inesperada del servidor (${res.status})`);
    }

    return { res, json };
}

// ---------- Login offline ----------
async function loginOffline(email: string, password: string): Promise<AuthUser> {
    const cred = await getStoredCred();
    if (!cred || cred.email !== email) {
        throw new Error(
            'Sin conexión. Debes iniciar sesión online al menos una vez con este usuario.'
        );
    }

    if (cred.v !== CRED_VERSION) {
        throw new Error(
            'Por seguridad, inicia sesión con conexión una vez para actualizar tus credenciales offline.'
        );
    }

    const candidate = await hashPassword(password, cred.salt, cred.iter ?? KDF_ITERATIONS);
    if (!safeEqual(candidate, cred.hash)) {
        throw new Error('Credenciales incorrectas');
    }

    const last = await getLastOnline();
    if (!last || Date.now() - last > MAX_OFFLINE_MS) {
        throw new Error('Llevas más de 7 días sin conexión. Conéctate para validar tu sesión.');
    }

    const cachedUser = await getAuthUser();
    if (!cachedUser) throw new Error('Sin conexión y sin datos locales del usuario');

    // Marcador de sesión offline (no es un token real)
    await setToken('offline');
    return cachedUser;
}

// ---------- Servicio ----------
export const authService = {
    async login(email: string, password: string, allowOffline = true): Promise<AuthUser> {
        const normalizedEmail = email.trim().toLowerCase();

        let result: { res: Response; json: any };
        try {
            result = await request('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password,
                    device_name: 'mobile',
                }),
            });
        } catch (err) {
            const puedeOffline =
                allowOffline &&
                (err instanceof NetworkError ||
                    (OFFLINE_ON_SERVER_ERROR && err instanceof ServerError));

            if (puedeOffline) {
                return loginOffline(normalizedEmail, password);
            }

            if (err instanceof NetworkError) {
                throw new Error('No hay conexión con el servidor. Inténtalo de nuevo.');
            }
            if (err instanceof ServerError) {
                throw new Error(
                    'El servidor no está disponible en este momento. Inténtalo más tarde.'
                );
            }
            throw err;
        }

        const { res, json } = result;
        if (!res.ok || !json?.success) {
            throw new Error(
                json?.message || json?.errors?.email?.[0] || 'No se pudo iniciar sesión'
            );
        }

        await setToken(json.token);
        await setAuthUser(json.user);
        await setLastOnlineNow();

        // Guardar credenciales offline: si falla, no debe romper el login
        try {
            const salt = randomSalt();
            const hash = await hashPassword(password, salt, KDF_ITERATIONS);
            await setStoredCred({
                email: normalizedEmail,
                salt,
                hash,
                v: CRED_VERSION,
                iter: KDF_ITERATIONS,
            });
        } catch (e) {
            if (__DEV__) console.warn('No se pudieron guardar las credenciales offline:', e);
        }

        return json.user;
    },

    async me(): Promise<AuthUser | null> {
        const token = await getToken();
        if (!token) return null;

        // Token marcador offline → usa cache directo
        if (token === 'offline') {
            return await getAuthUser();
        }

        try {
            const { res, json } = await request('/api/me', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            if (res.status === 401) {
                // Token realmente inválido → limpia sesión completa
                await clearToken();
                await clearAuthUser();
                await clearStoredCred();
                return null;
            }

            if (!res.ok || !json?.user) {
                return await getAuthUser();
            }

            await setAuthUser(json.user);
            await setLastOnlineNow();
            return json.user;
        } catch {
            // Sin red, timeout o error del servidor → devuelve cache
            return await getAuthUser();
        }
    },

    async logout(): Promise<void> {
        const token = await getToken();

        if (token && token !== 'offline') {
            try {
                await request('/api/logout', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                });
            } catch {
                // ignora errores al cerrar sesión
            }
        }

        await clearToken();
        await clearAuthUser();
        await clearStoredCred();
    },

    async clearSession(): Promise<void> {
        await clearToken();
        await clearAuthUser();
    },

    async getToken(): Promise<string | null> {
        return getToken();
    },

    async hasToken(): Promise<boolean> {
        const t = await getToken();
        return !!t;
    },

    async getStoredUser(): Promise<AuthUser | null> {
        return await getAuthUser();
    },

    async isOfflineSession(): Promise<boolean> {
        return (await getToken()) === 'offline';
    },

    /** true solo si hay un token real (no el marcador offline) */
    async hasRealSession(): Promise<boolean> {
        const t = await getToken();
        return !!t && t !== 'offline';
    },
};