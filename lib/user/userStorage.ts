import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ============================================
// Claves
// ============================================
const USUARIO_KEY = 'app_usuario_actual';
const TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
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
// Limpiar todo
// ============================================
export async function clearSession(): Promise<void> {
    await clearToken();
    await clearAuthUser();
}