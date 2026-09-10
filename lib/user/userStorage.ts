import AsyncStorage from '@react-native-async-storage/async-storage';

const USUARIO_KEY = 'app_usuario_actual';

/**
 * Guarda el nombre/usuario activo en el dispositivo (persiste entre reinicios de la app).
 */
export async function setUsuario(usuario: string): Promise<void> {
    await AsyncStorage.setItem(USUARIO_KEY, usuario);
}

/**
 * Lee el usuario activo guardado. Devuelve null si nunca se configuró.
 */
export async function getUsuario(): Promise<string | null> {
    return await AsyncStorage.getItem(USUARIO_KEY);
}

/**
 * Borra el usuario guardado (útil para un botón "Cerrar sesión" o "Cambiar usuario").
 */
export async function clearUsuario(): Promise<void> {
    await AsyncStorage.removeItem(USUARIO_KEY);
}