import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppBottomNav from '../../components/AppBottomNav';
import AppHeader from '../../components/AppHeader';
import { EstadoProyecto, Proyecto, proyectoService } from '../../lib/proyectos/proyectoService';

// Foto por defecto
const FOTO_DEFAULT = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800';

const FILTROS: Array<{ key: string; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'iniciar', label: 'Pendiente' },
  { key: 'en_progreso', label: 'En progreso' },
  { key: 'retrasada', label: 'Retrasado' },
  { key: 'observada', label: 'Observado' },
  { key: 'completado', label: 'Completado' },
];

const ESTADOS_CONFIG: Record<EstadoProyecto, { label: string; color: string; icono: string }> = {
  iniciar: { label: 'Pendiente', color: '#f59e0b', icono: '⚠️' },
  en_progreso: { label: 'En progreso', color: '#2563eb', icono: '🕐' },
  retrasada: { label: 'Retrasada', color: '#dc2626', icono: '⏰' },
  observada: { label: 'Observado', color: '#7c3aed', icono: '👁️' },
  completado: { label: 'Completado', color: '#15803d', icono: '✅' },
};

export default function InicioScreen() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [refrescando, setRefrescando] = useState(false);

  const cargarProyectos = useCallback(async (estado?: string) => {
    try {
      const data = await proyectoService.listar(estado);
      setProyectos(data);
    } catch (error: any) {
      showMessage({
        message: error.message ?? 'Error al cargar proyectos',
        type: 'danger',
        icon: 'danger',
      });
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  // Cargar al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      cargarProyectos(filtroActivo === 'todos' ? undefined : filtroActivo);
    }, [filtroActivo, cargarProyectos])
  );

  const cambiarFiltro = (key: string) => {
    setFiltroActivo(key);
  };

  const irAlProyecto = (id: number) => {
    router.push(`/proyecto/${id}` as any);
  };

  if (cargando) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#D8DCE0" />
        <AppHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7A1C1C" />
          <Text style={styles.loadingText}>Cargando proyectos...</Text>
        </View>
        <AppBottomNav active="inicio" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#D8DCE0" />

      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Buscador */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <Text style={styles.searchPlaceholder}>Buscar proyectos</Text>
          <Ionicons name="mic-outline" size={18} color="#7A1C1C" />
          <Ionicons name="filter-outline" size={18} color="#7A1C1C" />
        </View>

        {/* Filtros (pills) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtrosContainer}
        >
          {FILTROS.map((f) => {
            const activo = filtroActivo === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => cambiarFiltro(f.key)}
                style={[styles.filtroPill, activo && styles.filtroPillActivo]}
              >
                <Text style={[styles.filtroText, activo && styles.filtroTextActivo]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lista de proyectos */}
        {proyectos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay proyectos</Text>
            <Text style={styles.emptySubtext}>
              No tenés proyectos asignados con este filtro
            </Text>
          </View>
        ) : (
          <View style={styles.listaProyectos}>
            {proyectos.map((p) => (
              <TarjetaProyecto
                key={p.id}
                proyecto={p}
                onPress={() => irAlProyecto(p.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <AppBottomNav active="inicio" />
    </SafeAreaView>
  );
}

/**
 * Tarjeta individual de proyecto.
 */
function TarjetaProyecto({ proyecto, onPress }: { proyecto: Proyecto; onPress: () => void }) {
  const config = ESTADOS_CONFIG[proyecto.estado] ?? ESTADOS_CONFIG.iniciar;
  const foto = proyecto.foto_url || FOTO_DEFAULT;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Header: nombre + estado + flecha */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.dotEstado, { backgroundColor: config.color }]} />
          <Text style={styles.cardNombre} numberOfLines={1}>
            {proyecto.nombre}
          </Text>
          <Text style={[styles.cardEstado, { color: config.color }]}>
            {' | '}{config.label}
          </Text>
          <Text style={styles.cardEstadoIcono}>{config.icono}</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color="#374151" />
      </View>

      {/* Contenido: foto + datos */}
      <View style={styles.cardBody}>
        <Image source={{ uri: foto }} style={styles.cardFoto} resizeMode="cover" />

        <View style={styles.cardDatos}>
          <View style={styles.datoBloque}>
            <Text style={styles.datoLabel}>CLIENTE</Text>
            <Text style={styles.datoValor} numberOfLines={1}>
              {proyecto.cliente}
            </Text>
          </View>

          <View style={styles.datoBloque}>
            <Text style={styles.datoLabel}>CÓDIGO</Text>
            <Text style={styles.datoValor}>{proyecto.codigo}</Text>
          </View>

          <View style={styles.datoBloque}>
            <Text style={styles.datoLabel}>UBICACIÓN</Text>
            <Text style={styles.datoValor} numberOfLines={1}>
              {proyecto.ubicacion ?? '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Barra de progreso */}
      <View style={styles.progresoContainer}>
        <View style={styles.progresoBarra}>
          <View
            style={[
              styles.progresoRelleno,
              {
                width: `${proyecto.progreso}%`,
                backgroundColor: config.color,
              },
            ]}
          />
        </View>
        <Text style={styles.progresoTexto}>{proyecto.progreso}% Completado</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C8CDD0' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // Buscador
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#9ca3af',
    fontSize: 14,
  },

  // Filtros
  filtrosContainer: {
    gap: 8,
    paddingBottom: 16,
  },
  filtroPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  filtroPillActivo: {
    backgroundColor: '#7A1C1C',
    borderColor: '#7A1C1C',
  },
  filtroText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  filtroTextActivo: {
    color: '#fff',
  },

  // Lista
  listaProyectos: {
    gap: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubtext: { fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#7A1C1C',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  dotEstado: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    maxWidth: '45%',
  },
  cardEstado: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardEstadoIcono: {
    fontSize: 14,
    marginLeft: 2,
  },

  cardBody: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  cardFoto: {
    width: 110,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  cardDatos: {
    flex: 1,
    justifyContent: 'space-between',
  },
  datoBloque: {
    marginBottom: 4,
  },
  datoLabel: {
    fontSize: 9,
    color: '#9ca3af',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  datoValor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginTop: 1,
  },

  // Progreso
  progresoContainer: {
    marginTop: 4,
  },
  progresoBarra: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progresoRelleno: {
    height: '100%',
    borderRadius: 9999,
  },
  progresoTexto: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '600',
  },
});