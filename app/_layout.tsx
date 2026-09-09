import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
        <SyncStatusBanner />
        <SafeAreaView style={{ flex: 1, backgroundColor: '#e2e8f0' }} edges={['top', 'bottom']}>
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaView>
      </SyncProvider>
    </SafeAreaProvider>
  );
}
