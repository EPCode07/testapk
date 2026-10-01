import { ActividadProvider } from '@/lib/actividades/ActividadContext';
import { SucesosProvider } from '@/lib/sucesos/SucesosContext';
import { AuthProvider } from '@/lib/user/AuthContext';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import FlashMessage from 'react-native-flash-message';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import ReauthPrompt from '../components/login/ReauthPrompt';
import { SyncProvider } from '../lib/sync/SyncContext';
import { registerBackgroundSync } from '../lib/sync/backgroundTask';


SplashScreen.preventAutoHideAsync();

function Flash() {
  const insets = useSafeAreaInsets();
  return <FlashMessage position="top" statusBarHeight={insets.top} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
  });

  useEffect(() => {
    registerBackgroundSync();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SyncProvider>
          <ActividadProvider>
            <SucesosProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="camera" />
                <Stack.Screen name="photo-album" />
                <Stack.Screen name="photo-description" />
                <Stack.Screen name="cerrar-dia" />
                <Stack.Screen name="reporte-detalle" />
                <Stack.Screen name="reporte-resumen-ia" />
                <Stack.Screen name="login" />
                <Stack.Screen name="seguridad" />
                <Stack.Screen name="set-usuario" />
                <Stack.Screen name="sincronizacion" />
                <Stack.Screen name="programar-manana" />
                <Stack.Screen name="galeria/proyecto/[id]" />
                <Stack.Screen name="galeria/estacion/[id]" />
              </Stack>
              <ReauthPrompt />
              <Flash />
            </SucesosProvider>
          </ActividadProvider>
        </SyncProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}