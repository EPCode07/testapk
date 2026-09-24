import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSync } from '../../lib/sync/SyncContext';

import { useNetInfo } from '@react-native-community/netinfo';

import { downloadWordReport, generatePhotoReportPDF } from '../utils/reportGenerator';

import { Asset } from 'expo-asset';

import CustomAlert from '../../components/CustomAlert';

import { useCallback } from 'react';

import { useFocusEffect } from 'expo-router';

import { clearAuthUser } from '../../lib/user/userStorage';

import { authService, AuthUser } from '@/lib/user/authService';

import AppBottomNav from '../../components/AppBottomNav';
import AppHeader from '../../components/AppHeader';

import { SyncNetwork, syncPreferences } from '../../lib/sync/syncPreferences';

import { getUsuario } from '../../lib/user/userStorage';

export default function TabScreen() {

  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();

  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });

  const { isSyncing, isOnline, pendingCount } = useSync();

  const hasPending = pendingCount > 0;
  const isErrorState = !isOnline || hasPending;

  const [generando, setGenerando] = useState(false);
  const [isAlertVisible, setIsAlertVisible] = useState(false);

  const [user, setUser] = useState<AuthUser | null>(null);

  const [usuario, setUsuario] = useState<string | null>(null);

  const [syncNetwork, setSyncNetwork] = useState<SyncNetwork>('wifi');

  const syncStatusText = isSyncing
    ? "Sincronizando..."
    : !isOnline
      ? "Sin conexión · " + pendingCount + " foto(s) por subir"
      : hasPending
        ? `${pendingCount} foto(s) pendiente(s)`
        : "Estado de sincronización OK";

  const syncColor = isErrorState || isSyncing ? "#C62828" : "#2E7D32";
  const syncIconName = isSyncing
    ? "sync-outline"
    : !isOnline
      ? "cloud-offline-outline"
      : hasPending
        ? "alert-circle-outline"
        : "cloud-done-outline";

  const getConnectionLabel = () => {
    if (!netInfo.isConnected) return 'Sin conexión';
    if (netInfo.type === 'wifi') return 'Wi-Fi';
    if (netInfo.type === 'cellular') return 'Datos móviles';
    return 'Wifi y Datos';
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch { }
    await clearAuthUser();
    router.replace('/login' as any);
  };
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        // 1. Nombre del usuario (legacy)
        getUsuario().then(setUsuario);

        // 2. Preferencia de red
        const pref = await syncPreferences.getNetwork();
        setSyncNetwork(pref);

        // 3. Usuario en caché
        const cached = await authService.getStoredUser();
        if (cached) setUser(cached);

        // 4. Refrescar desde backend (silencioso)
        const fresh = await authService.me();
        if (fresh) setUser(fresh);
      })();
    }, [])
  );

  const handleOptionSelect = (action: string) => {
    setMenuVisible(false);
    if (action === 'asset') {
      handleGenerateWithAsset();
    } else if (action === 'download') {
      handleDownloadWord();
    }
  };

  const handleRefreshProfile = async () => {
    setMenuVisible(false);
    const fresh = await authService.me();
    if (fresh) {
      setUser(fresh);
      setAlert({
        visible: true,
        title: 'Actualizado',
        message: 'Perfil actualizado correctamente',
      });
    } else {
      setAlert({
        visible: true,
        title: 'Error',
        message: 'No se pudo actualizar el perfil',
      });
    }
  };

  async function handleGenerateWithAsset() {
    try {
      const asset = Asset.fromModule(require('../assets/documentos/pdf/Formato_IT_RD_V2_02.07.26.pdf'));
      await asset.downloadAsync();

      let baseUri = asset.localUri;
      if (!baseUri) {
        throw new Error('No se pudo cargar la plantilla PDF local.');
      }


      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/listall?usuario=${user}`, {
        headers: {
          'x-api-secret': process.env.EXPO_PUBLIC_API_SECRET ?? ''
        },
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || 'Error consultando fotos');
      }

      const items = json.data;

      if (!items || items.length === 0) {
        console.log('No hay registros disponibles para generar el PDF.');
        return;
      }

      await generatePhotoReportPDF(items, baseUri);

    } catch (error) {
      console.error('Error al generar el PDF con datos de Supabase:', error);
    }
  }

  async function handleDownloadWord() {
    setGenerando(true);
    try {
      await downloadWordReport();
    } catch (error: any) {
      <CustomAlert
        visible={isAlertVisible}
        appName="Yhoma Reportes"
        appIconSource={require('../../assets/images/app-logo.png')}
        title='Error al generar el reporte'
        message={error.message}

        onClose={() => setIsAlertVisible(false)}
        onAccept={() => { }}
      />
    } finally {
      setGenerando(false);
    }
  }


  const isConnected = netInfo.isConnected;
  const statusColor = isConnected ? '#333' : '#C62828';

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#D8DCE0" />

      <AppHeader
        variant='main'
        showMenuButton={true}
        onMenuPress={() => setMenuVisible(true)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Perfil</Text>

          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => router.push('/set-usuario' as any)}
          >
            <View style={styles.itemRow}>
              {user?.personal?.foto ? (
                <Image
                  source={{
                    uri: `${process.env.EXPO_PUBLIC_BACKEND_URL}/storage/${user.personal.foto}`,
                  }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.itemIconContainer}>
                  <Ionicons name="person-outline" size={20} color="#333" />
                </View>
              )}
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemLabel}>NOMBRE</Text>
                <Text style={styles.itemValue}>{user?.name ?? '—'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.itemRow}>
            <View style={styles.itemIconContainer}>
              <Ionicons name="call-outline" size={20} color="#333" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>CELULAR</Text>
              <Text style={styles.itemValue}>{user?.personal?.telefono ?? '—'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.itemRow}>
            <View style={styles.itemIconContainer}>
              <Ionicons name="mail-outline" size={20} color="#333" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>CORREO</Text>
              <Text style={styles.itemValue}>{user?.email ?? '—'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.itemRow}>
            <View style={styles.itemIconContainer}>
              <Ionicons name="briefcase-outline" size={20} color="#333" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>ÁREA</Text>
              <Text style={styles.itemValue}>{user?.area ?? '—'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => router.push('/seguridad' as any)}
          >
            <View style={styles.itemIconContainer}>
              <Ionicons name="key-outline" size={20} color="#333" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>SEGURIDAD</Text>
              <Text style={styles.itemValue}>Biometría, Contraseña</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Sección Almacenamiento */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Almacenamiento</Text>

          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => router.push('/sincronizacion' as any)}
          >
            <View style={styles.itemIconContainer}>
              <Ionicons
                name={syncNetwork === 'wifi' ? 'wifi-outline' : 'cellular-outline'}
                size={20}
                color={statusColor}
              />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>SINCRONIZACIÓN</Text>
              <Text style={[styles.itemValue, !isConnected && styles.textOffline]}>
                {syncNetwork === 'wifi' ? 'Solo WiFi' : 'WiFi y datos móviles'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.itemRow}>
            <View style={styles.itemIconContainer}>
              <Ionicons name="trash-outline" size={20} color="#333" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>ELIMINAR DEL DISPOSITIVO TRAS</Text>
              <Text style={styles.itemValue}>3 Meses</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.itemRow}>
            <Text style={[styles.syncStateText, { color: syncColor }]}>
              {syncStatusText}
            </Text>
            <Ionicons name={syncIconName} size={22} color={syncColor} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#7A1C1C" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.footerVersion}>Yhoma Reportes V1.0</Text>

      </ScrollView>

      <AppBottomNav active="inicio" />

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleOptionSelect('asset')}
            >
              <Ionicons name="document-text-outline" size={20} color="#8B1E24" style={styles.menuIcon} />
              <Text style={styles.menuText}>Descargar PDF</Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleOptionSelect('download')}
            >
              <Ionicons name="document-outline" size={20} color="#114ccbff" style={styles.menuIcon} />
              <Text style={styles.menuText}>Descargar Word</Text>
            </TouchableOpacity>


            <View style={styles.separator} />

            {/* Opción 3: Refrescar datos del perfil */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRefreshProfile}
            >
              <Ionicons name="refresh-outline" size={20} color="#2E7D32" style={styles.menuIcon} />
              <Text style={styles.menuText}>Refrescar datos</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C8CDD0',
  },
  header: {
    backgroundColor: '#D8DCE0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  topLogo: {
    width: 52,
    height: 52,
  },
  logoBox: {
    backgroundColor: '#ffffffff',
    marginRight: 10,
  },
  brandTitleContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#777777',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#E2E6E8',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  cardSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7A1C1C',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemIconContainer: {
    backgroundColor: '#CCCCCC',
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#CCCCCC',   // fondo mientras carga
  },
  itemTextContainer: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 10,
    color: '#888888',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222222',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#D0D4D7',
    marginVertical: 4,
  },
  syncStateText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  textOffline: {
    color: '#C62828',
  },
  logoutButton: {
    borderWidth: 1.5,
    borderColor: '#7A1C1C',
    borderRadius: 25,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  logoutText: {
    color: '#7A1C1C',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  footerVersion: {
    textAlign: 'center',
    color: '#888888',
    fontSize: 11,
    marginTop: 14,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#D8DCE0',
    paddingVertical: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 11,
    color: '#555555',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#7A1C1C',
    fontWeight: 'bold',
  },

  iconBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    marginTop: 60,
    marginRight: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    color: '#333333',
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
});