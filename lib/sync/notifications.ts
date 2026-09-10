import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    // Canal dedicado para procesos en segundo plano / sincronización
    await Notifications.setNotificationChannelAsync('sync', {
      name: 'Sincronización de Datos',
      importance: Notifications.AndroidImportance.HIGH, // Alta prioridad para asegurar banner flotante
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4DA6FF',
    });
  }

  return finalStatus === 'granted';
}

export async function notifySyncStarted(count: number) {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: '📤 Sincronizando fotos',
      body: `Subiendo ${count} foto(s) ...`,
      data: { type: 'sync_started' },

    },
    trigger: null,
  });
}

export async function notifySyncFinished(uploaded: number, failed: number) {
  const isPartial = failed > 0;

  return await Notifications.scheduleNotificationAsync({
    content: {
      title: isPartial ? '⚠️ Sincronización con errores' : '✅ Sincronización exitosa',
      body: isPartial
        ? `${uploaded} subida(s), ${failed} fallida(s). Reintentando luego.`
        : `Se subieron ${uploaded} foto(s) a la nube correctamente.`,
      data: { type: 'sync_finished', uploaded, failed },
    },
    trigger: null,
  });
}