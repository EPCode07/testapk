import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import FlashMessage from 'react-native-flash-message';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SyncProvider } from '../lib/sync/SyncContext';
import { registerBackgroundSync } from '../lib/sync/backgroundTask';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
  });

  useEffect(() => {
    registerBackgroundSync();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SyncProvider>
        <FlashMessage position="top" />
        <Stack screenOptions={{ headerShown: false }} />
      </SyncProvider>
    </SafeAreaProvider>
  );
}