import { Tabs, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Keyboard, Platform, StatusBar, View } from 'react-native'; // 👈 StatusBar de RN
import AppBottomNav from '../../components/AppBottomNav';

type TabKey = 'inicio' | 'camera_now' | 'galeria' | 'reportes' | 'ajustes' | 'sucesos';

export default function TabsLayout() {
  const pathname = usePathname();

  useEffect(() => {
    Keyboard.dismiss();

    if (Platform.OS === 'android') {
      StatusBar.setHidden(false, 'fade');
      StatusBar.setBackgroundColor('#ffffff', true);
      StatusBar.setBarStyle('dark-content', true);
      StatusBar.setTranslucent(false);
    }
  }, [pathname]);

  const getActiveTab = (): TabKey => {
    if (pathname.includes('galeria')) return 'galeria';
    if (pathname.includes('sucesos')) return 'sucesos';
    if (pathname.includes('camera_now')) return 'camera_now';
    if (pathname.includes('mis-reportes')) return 'reportes';
    if (pathname.includes('ajustes')) return 'ajustes';
    return 'inicio';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      <Tabs
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
        tabBar={() => <AppBottomNav active={getActiveTab()} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="galeria" />
        <Tabs.Screen name="sucesos" />
        <Tabs.Screen name="camera_now" />
        <Tabs.Screen name="mis-reportes" />
        <Tabs.Screen name="ajustes" />
      </Tabs>
    </View>
  );
}