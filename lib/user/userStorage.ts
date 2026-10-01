import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ============================================
// Claves
// ============================================
const USUARIO_KEY = 'app_usuario_actual';
const TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const CRED_KEY = 'auth_cred';
const LAST_ONLINE_KEY = 'last_online';

// ============================================
// Nombre del usuario (compatibilidad con TabScreen)
// ============================================
export async function setUsuario(usuario: string): Promise<void> {
    await AsyncStorage.setItem(USUARIO_KEY, usuario);
}

export async function getUsuario(): Promise<string | null> {
    return await AsyncStorage.getItem(USUARIO_KEY);
}

export async function clearUsuario(): Promise<void> {
    await AsyncStorage.removeItem(USUARIO_KEY);
}

// ============================================
// Token (SecureStore)
// ============================================
export async function setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ============================================
// Usuario completo (AsyncStorage)
// ============================================
export async function setAuthUser(user: any): Promise<void> {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export async function getAuthUser(): Promise<any | null> {
    const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
}

export async function clearAuthUser(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_USER_KEY);
}

// ============================================
// Credenciales offline (SecureStore)
// ============================================
export interface StoredCred {
    email: string;
    salt: string;
    hash: string;
    v?: number;
    iter?: number;
}

export async function setStoredCred(cred: StoredCred): Promise<void> {
    await SecureStore.setItemAsync(CRED_KEY, JSON.stringify(cred));
}

export async function getStoredCred(): Promise<StoredCred | null> {
    const raw = await SecureStore.getItemAsync(CRED_KEY);
    return raw ? (JSON.parse(raw) as StoredCred) : null;
}

export async function clearStoredCred(): Promise<void> {
    await SecureStore.deleteItemAsync(CRED_KEY);
}

// ============================================
// Última conexión online (para expiración offline)
// ============================================
export async function setLastOnlineNow(): Promise<void> {
    await AsyncStorage.setItem(LAST_ONLINE_KEY, String(Date.now()));
}

export async function getLastOnline(): Promise<number | null> {
    const raw = await AsyncStorage.getItem(LAST_ONLINE_KEY);
    return raw ? Number(raw) : null;
}

// ============================================
// Limpiar todo
// ============================================
export async function clearSession(): Promise<void> {
    await clearToken();
    await clearAuthUser();
}