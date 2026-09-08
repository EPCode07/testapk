import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SyncProvider } from '../lib/sync/SyncContext';
import SyncStatusBanner from '../components/SyncStatusBanner';
import { registerBackgroundSync } from '../lib/sync/backgroundTask';

export default function RootLayout() {
  useEffect(() => {
    registerBackgroundSync();
  }, []);

  return (
    <SafeAreaProvider>
      <SyncProvider>
        {/* Este banner queda por encima de TODAS las pantallas de la app */}
        <SyncStatusBanner />
        <Stack screenOptions={{ headerShown: false }} />
      </SyncProvider>
    </SafeAreaProvider>
  );
}
