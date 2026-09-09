import React from 'react';
import { router } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons, Octicons } from '@expo/vector-icons';

export default function TabScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#D8DCE0" />

      {/* Header Superior */}
      {/* Header Superior */}
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
          {/* Botón para abrir la cámara */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/camera')}
          >
            <Ionicons name="camera-outline" size={22} color="#333333" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color="#333333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido Desplazable */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Sección Perfil */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Perfil</Text>

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
              <Ionicons name="sync-outline" size={20} color="#333" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>SINCRONIZACIÓN</Text>
              <Text style={styles.itemValue}>Wifi y Datos</Text>
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
            <Text style={styles.syncStateText}>Estado de sincronización</Text>
            <Ionicons name="cloud-done-outline" size={22} color="#2E7D32" />
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
  iconBtn: {
    padding: 4,
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
    color: '#2E7D32',
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
});