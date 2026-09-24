import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getAuthUser, setAuthUser, setToken } from './userStorage';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

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
    } | null;
    roles: string[];
    permissions: string[];
}

export const authService = {
    async login(email: string, password: string): Promise<AuthUser> {
        const res = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ email, password, device_name: 'mobile' }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
            const msg =
                json.message ||
                json.errors?.email?.[0] ||
                'No se pudo iniciar sesión';
            throw new Error(msg);
        }

        await setToken(json.token);
        await setAuthUser(json.user);

        return json.user;
    },

    async me(): Promise<AuthUser | null> {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return null;

        try {
            const res = await fetch(`${BASE_URL}/api/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    await this.clearSession();
                }
                return null;
            }

            const json = await res.json();
            await setAuthUser(json.user);
            return json.user;
        } catch {
            return null;
        }
    },

    async logout(): Promise<void> {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);

        if (token) {
            try {
                await fetch(`${BASE_URL}/api/logout`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                });
            } catch {
                // ignorar error de red
            }
        }

        await this.clearSession();
    },

    async clearSession(): Promise<void> {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await AsyncStorage.removeItem(USER_KEY);
    },

    async getToken(): Promise<string | null> {
        return SecureStore.getItemAsync(TOKEN_KEY);
    },

    async hasToken(): Promise<boolean> {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        return !!token;
    },

    async getStoredUser(): Promise<AuthUser | null> {
        return await getAuthUser();
    },
};