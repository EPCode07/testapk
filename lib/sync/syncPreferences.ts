import AsyncStorage from '@react-native-async-storage/async-storage';

export type SyncNetwork = 'wifi' | 'any';

const KEY = 'sync_network_preference';

export const syncPreferences = {
    async getNetwork(): Promise<SyncNetwork> {
        const value = await AsyncStorage.getItem(KEY);
        return (value as SyncNetwork) ?? 'wifi';   // por defecto: solo WiFi
    },

    async setNetwork(value: SyncNetwork): Promise<void> {
        await AsyncStorage.setItem(KEY, value);
    },
};