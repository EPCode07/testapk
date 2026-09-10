import React, { useState } from 'react';
import { router } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Button,
  Modal,
  ActivityIndicator,

} from 'react-native';
import { Ionicons, Feather, MaterialIcons, Octicons } from '@expo/vector-icons';

import { useSync } from '../lib/sync/SyncContext';

import { useNetInfo } from '@react-native-community/netinfo';

import { generatePhotoReportPDF } from './utils/reportGenerator';
import { downloadWordReport } from './utils/reportGenerator';

import { Asset } from 'expo-asset';

import CustomAlert from '../components/CustomAlert';



import { useCallback } from 'react';

import { useFocusEffect } from 'expo-router';

import { getUsuario } from '../lib/user/userStorage';

export default function TabScreen() {

  const netInfo = useNetInfo();

  const { isSyncing, isOnline, pendingCount } = useSync();

  const hasPending = pendingCount > 0;
  const isErrorState = !isOnline || hasPending;

  const [generando, setGenerando] = useState(false);
  const [isAlertVisible, setIsAlertVisible] = useState(false);

  const [usuario, setUsuario] = useState<string | null>(null);


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


  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getUsuario().then(setUsuario);
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

  async function handleGenerateWithAsset() {
    try {
      const asset = Asset.fromModule(require('../assets/documentos/pdf/Formato_IT_RD_V2_02.07.26.pdf'));
      await asset.downloadAsync();

      let baseUri = asset.localUri;
      if (!baseUri) {
        throw new Error('No se pudo cargar la plantilla PDF local.');
      }


      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/listall?usuario=${usuario}`, {
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
        appIconSource={require('../assets/images/app-logo.png')}
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#D8DCE0" />

      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBox}>
            <Ionicons name="document-text" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.brandTitleContainer}>
            <Text style={styles.brandTitle}>REPORTES</Text>
            <Text style={styles.brandSubtitle}>Yhoma Reportes V1.0</Text>
          </View>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              try {
                console.log('🚀 Intentando navegar a /camera...');
                router.push('/camera');
              } catch (error) {
                console.error('❌ Error atrapado en navegación:', error);
              }
            }}
          >
            <Ionicons name="camera-outline" size={22} color="#333333" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color="#333333" />
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleGenerateWithAsset}
          >
            <Ionicons name="document-text-outline" size={22} color="#333333" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleDownloadWord}
            disabled={generando}
          >
            {generando ? (
              <ActivityIndicator size="small" color="#333333" />
            ) : (
              <Ionicons name="document-outline" size={22} color="#333333" />
            )}
          </TouchableOpacity> */}

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setMenuVisible(true)}
            disabled={generando}
          >
            {generando ? (
              <ActivityIndicator size="small" color="#333333" />
            ) : (
              <Ionicons name="ellipsis-vertical" size={22} color="#333333" />
            )}
          </TouchableOpacity>

          {/* Menú desplegable usando Modal */}
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

                {/* Opción 1: Generar con Asset */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleOptionSelect('asset')}
                >
                  <Ionicons name="document-text-outline" size={20} color="#8B1E24" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Descargar PDF</Text>
                </TouchableOpacity>

                <View style={styles.separator} />

                {/* Opción 2: Descargar Word */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleOptionSelect('download')}
                >
                  <Ionicons name="document-outline" size={20} color="#114ccbff" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Descargar Word</Text>
                </TouchableOpacity>

              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Perfil</Text>

          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => router.push('/set-usuario' as any)}
          >
            <View style={styles.itemIconContainer}>
              <Ionicons name="person-outline" size={20} color="#333" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>NOMBRE</Text>
              <Text style={styles.itemValue}>{usuario ?? '—'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.itemRow}>
            <View style={styles.itemIconContainer}>
              <Ionicons name="call-outline" size={20} color="#333" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>CELULAR</Text>
              <Text style={styles.itemValue}>+51 987 654 321</Text>
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
              <Text style={styles.itemValue}>nombreapellido@yhoma.pe</Text>
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
              <Text style={styles.itemValue}>Operaciones</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.itemRow}>
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

          <TouchableOpacity style={styles.itemRow}>
            <View style={styles.itemIconContainer}>
              <Ionicons
                name={isConnected ? "sync-outline" : "cloud-offline-outline"}
                size={20}
                color={statusColor}
              />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>SINCRONIZACIÓN</Text>
              <Text style={[styles.itemValue, !isConnected && styles.textOffline]}>
                {getConnectionLabel()}
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

        {/* Botón Cerrar Sesión */}
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color="#7A1C1C" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        {/* Footer Text */}
        <Text style={styles.footerVersion}>Yhoma Reportes V1.0</Text>

      </ScrollView>

      {/* Navegación Inferior (Bottom Bar) */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Octicons name="home" size={22} color="#555" />
          <Text style={styles.navLabel}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="location-outline" size={22} color="#555" />
          <Text style={styles.navLabel}>Mapa</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="image-outline" size={22} color="#555" />
          <Text style={styles.navLabel}>Galería</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="settings-sharp" size={22} color="#7A1C1C" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Ajustes</Text>
        </TouchableOpacity>
      </View>
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
  logoBox: {
    backgroundColor: '#7A1C1C',
    padding: 8,
    borderRadius: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Fondo semitransparente para cerrar al tocar fuera
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    marginTop: 60, // Ajusta según la altura de tu header/barra
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