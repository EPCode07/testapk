import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
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
    await Notifications.setNotificationChannelAsync('sync', {
      name: 'Sincronización',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return finalStatus === 'granted';
}

export async function notifySyncStarted(count: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sincronizando fotos',
      body: `Subiendo ${count} foto(s) a Drive...`,
    },
    trigger: null,
  });
}

export async function notifySyncFinished(uploaded: number, failed: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: failed > 0 ? 'Sincronización parcial' : 'Sincronización completa',
      body:
        failed > 0
          ? `${uploaded} foto(s) subida(s), ${failed} pendiente(s) por error.`
          : `${uploaded} foto(s) subida(s) a Drive correctamente.`,
    },
    trigger: null,
  });
}
