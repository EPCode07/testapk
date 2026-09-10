import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SyncProvider } from '../lib/sync/SyncContext';
import { registerBackgroundSync } from '../lib/sync/backgroundTask';
import FlashMessage from 'react-native-flash-message';

export default function RootLayout() {
  useEffect(() => {
    registerBackgroundSync();
  }, []);

  return (
    <SafeAreaProvider>
      <SyncProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#e2e8f0' }} edges={['top', 'bottom']}>
          <FlashMessage position="top" />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaView>
      </SyncProvider>
    </SafeAreaProvider>
  );
}
