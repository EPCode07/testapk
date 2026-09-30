import { Tabs, usePathname } from 'expo-router';
import { View } from 'react-native';
import AppBottomNav from '../../components/AppBottomNav';

type TabKey = 'inicio' | 'mapa' | 'galeria' | 'reportes' | 'ajustes' | 'sucesos';

export default function TabsLayout() {
  const pathname = usePathname();

  // 🔑 Detectar qué tab está activo según la URL
  const getActiveTab = (): TabKey => {
    if (pathname.includes('galeria')) return 'galeria';
    if (pathname.includes('sucesos')) return 'sucesos';
    if (pathname.includes('mapa')) return 'mapa';
    if (pathname.includes('mis-reportes')) return 'reportes';
    if (pathname.includes('ajustes')) return 'ajustes';
    return 'inicio';
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },   // 👈 ocultamos la barra nativa
          animation: 'none',                    // 👈 sin animación al cambiar
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="galeria" />
        <Tabs.Screen name="sucesos" />
        <Tabs.Screen name="mapa" />
        <Tabs.Screen name="mis-reportes" />
        <Tabs.Screen name="ajustes" />
      </Tabs>

      {/* 🔑 Bottom nav custom, se dibuja UNA vez */}
      <AppBottomNav active={getActiveTab()} />
    </View>
  );
}