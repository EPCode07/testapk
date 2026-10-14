import { Tabs, usePathname } from 'expo-router';
import { View } from 'react-native';
import AppBottomNav from '../../components/AppBottomNav';

type TabKey = 'inicio' | 'camera_now' | 'galeria' | 'reportes' | 'ajustes' | 'sucesos';

export default function TabsLayout() {
  const pathname = usePathname();

  const getActiveTab = (): TabKey => {
    if (pathname.includes('galeria')) return 'galeria';
    if (pathname.includes('sucesos')) return 'sucesos';
    if (pathname.includes('camera_now')) return 'camera_now';
    if (pathname.includes('mis-reportes')) return 'reportes';
    if (pathname.includes('ajustes')) return 'ajustes';
    return 'inicio';
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          animation: 'none',
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="galeria" />
        <Tabs.Screen name="sucesos" />
        <Tabs.Screen name="camera_now" />
        <Tabs.Screen name="mis-reportes" />
        <Tabs.Screen name="ajustes" />
      </Tabs>

      <AppBottomNav active={getActiveTab()} />
    </View>
  );
}