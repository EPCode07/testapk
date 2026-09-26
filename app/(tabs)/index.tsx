import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import AppBottomNav from '../../components/AppBottomNav';
import AppHeader from '../../components/AppHeader';
import EstadoIcon from '../../components/EstadoIcon';
import { EstadoProyecto, Proyecto, proyectoService } from '../../lib/proyectos/proyectoService';


const FOTO_DEFAULT = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800';

const ESTADOS_CONFIG: Record<EstadoProyecto, { label: string }> = {
  iniciar: { label: 'Pendiente' },
  en_progreso: { label: 'En progreso' },
  retrasada: { label: 'Retrasada' },
  observada: { label: 'Observado' },
  completado: { label: 'Completado' },
};

const FILTROS: Array<{ key: string; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'iniciar', label: 'Pendiente' },
  { key: 'en_progreso', label: 'En progreso' },
  { key: 'observada', label: 'Observado' },
  { key: 'completado', label: 'Completado' },
];

const COLORS_ESTADO = {
  iniciar: '#D98E04',
  en_progreso: '#2563EB',
  retrasada: '#DC2626',
  observada: '#6F42C1',
  completado: '#2E8B57',
};

export default function InicioScreen() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const [isListening, setIsListening] = useState(false);

  // Escuchar los eventos de la librería
  useSpeechRecognitionEvent('start', () => setIsListening(true));
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('error', (event) => {
    console.log('Error de reconocimiento:', event.error, event.message);
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const texto = event.results[0]?.transcript;
    if (texto) {
      setBusqueda(texto);
    }
  });



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
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarProyectos(filtroActivo === 'todos' ? undefined : filtroActivo);
    }, [filtroActivo, cargarProyectos])
  );


  useEffect(() => {
    const subStart = ExpoSpeechRecognitionModule.addListener('start', () => {
      setIsListening(true);
    });

    const subEnd = ExpoSpeechRecognitionModule.addListener('end', () => {
      setIsListening(false);
    });

    const subResult = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
      const texto = event.results[0]?.transcript ?? '';
      if (texto) {
        setBusqueda(texto);
      }
    });

    const subError = ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
      console.log('Error de voz:', event.error);
      setIsListening(false);
    });

    return () => {
      subStart.remove();
      subEnd.remove();
      subResult.remove();
      subError.remove();
    };
  }, []);


  const iniciarBusquedaPorVoz = async () => {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      Alert.alert('Permiso denegado', 'Necesitamos acceso al micrófono.');
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: 'es-ES',
      interimResults: false,        // 👈 mejor false para búsqueda (solo resultado final)
      continuous: false,
      requiresOnDeviceRecognition: false,
    });
  };

  const detenerBusquedaPorVoz = () => {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
  };

  // Filtrado local por búsqueda
  const proyectosFiltrados = proyectos.filter((p) => {
    if (busqueda.trim() === '') return true;

    const query = busqueda.toLowerCase().trim();
    return (
      p.nombre.toLowerCase().includes(query) ||
      p.codigo.toLowerCase().includes(query) ||
      p.cliente.toLowerCase().includes(query) ||
      (p.ubicacion ?? '').toLowerCase().includes(query)
    );
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Buscador */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder={isListening ? '🎤 Escuchando...' : 'Buscar proyectos'}
            placeholderTextColor={isListening ? '#B5121B' : '#9CA3AF'}
            value={busqueda}
            onChangeText={setBusqueda}
            autoCorrect={false}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.searchIconBtn}
            onPress={isListening ? detenerBusquedaPorVoz : iniciarBusquedaPorVoz}
          >
            <Ionicons
              name="mic-outline"
              size={20}
              color={isListening ? '#B5121B' : '#6B7280'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchIconBtn}>
            <Ionicons name="funnel-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
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
                onPress={() => setFiltroActivo(f.key)}
                style={[styles.filtroPill, activo ? styles.filtroPillActivo : styles.filtroPillInactivo]}
                activeOpacity={0.85}
              >
                <Text style={[styles.filtroText, activo ? styles.filtroTextActivo : styles.filtroTextInactivo]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Loading */}
        {cargando && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#910E16" />
          </View>
        )}

        {/* Empty */}
        {!cargando && proyectosFiltrados.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              {busqueda ? 'Sin resultados' : 'No hay proyectos'}
            </Text>
            <Text style={styles.emptySubtext}>
              {busqueda
                ? `No se encontraron proyectos con "${busqueda}"`
                : 'No tenés proyectos con este filtro'}
            </Text>
          </View>
        )}

        {/* Lista */}
        {!cargando && proyectosFiltrados.length > 0 && (
          <View style={styles.listaProyectos}>
            {proyectosFiltrados.map((p) => (
              <TarjetaProyecto
                key={p.id}
                proyecto={p}
                onPress={() => router.push(`/proyecto/${p.id}` as any)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <AppBottomNav active="inicio" />
    </SafeAreaView>
  );
}

/* TarjetaProyecto se queda igual */
function TarjetaProyecto({ proyecto, onPress }: { proyecto: Proyecto; onPress: () => void }) {
  const config = ESTADOS_CONFIG[proyecto.estado] ?? ESTADOS_CONFIG.iniciar;
  const foto = proyecto.foto_url || FOTO_DEFAULT;

  return (
    <View style={styles.card}>
      {/* HEADER: nombre + estado + icono + flecha clickeable */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardNombre} numberOfLines={1}>
            ● {proyecto.nombre}
          </Text>
          <Text style={[styles.cardSeparadorTexto, { color: COLORS_ESTADO[proyecto.estado] }]}>|</Text>
          <Text style={[styles.cardEstado, { color: COLORS_ESTADO[proyecto.estado] }]}>
            {config.label}
          </Text>
          <EstadoIcon estado={proyecto.estado} size={18} strokeWidth={2} />
        </View>

        {/* 👇 Solo la flecha navega */}
        <TouchableOpacity
          onPress={onPress}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          style={styles.arrowBtn}
        >
          <Ionicons name="arrow-forward" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* BODY: foto + datos (no clickeable) */}
      <View style={styles.cardBody}>
        <Image source={{ uri: foto }} style={styles.cardFoto} resizeMode="cover" />
        <View style={styles.cardDatos}>
          <View style={styles.datoBloque}>
            <Text style={styles.datoLabel}>CLIENTE</Text>
            <Text style={styles.datoValor} numberOfLines={1}>{proyecto.cliente}</Text>
          </View>
          <View style={styles.separador} />
          <View style={styles.datoBloque}>
            <Text style={styles.datoLabel}>CÓDIGO</Text>
            <Text style={styles.datoValor} numberOfLines={1}>{proyecto.codigo}</Text>
          </View>
          <View style={styles.separador} />
          <View style={styles.datoBloque}>
            <Text style={styles.datoLabel}>UBICACIÓN</Text>
            <Text style={styles.datoValor} numberOfLines={1}>{proyecto.ubicacion ?? '—'}</Text>
          </View>
        </View>
      </View>

      {/* FOOTER: progreso */}
      <View style={styles.progresoContainer}>
        <View style={styles.progresoBarra}>
          <View
            style={[
              styles.progresoRelleno,
              { width: `${proyecto.progreso}%`, backgroundColor: '#B5121B' },
            ]}
          />
        </View>
        <Text style={styles.progresoTexto}>{proyecto.progreso}% Completado</Text>
      </View>
    </View>
  );
}
/* ============================================================
   ESTILOS
   ============================================================ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECEDEF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Filtros
  filtrosContainer: {
    gap: 8,
    paddingBottom: 16,
  },
  filtroPill: {
    borderRadius: 10,
    height: 35,
    paddingHorizontal: 10,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtroPillActivo: {
    borderWidth: 2,
    borderColor: '#B5121B',
    backgroundColor: '#910E16',
  },
  filtroPillInactivo: {
    borderWidth: 2,
    borderColor: '#ACACAC',
    backgroundColor: '#ECEDEF',
  },
  filtroText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    lineHeight: 16,
  },
  filtroTextActivo: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  filtroTextInactivo: {
    color: '#374151',
    fontFamily: 'Poppins-Regular',
  },

  // Loading / Empty
  loadingContainer: { padding: 40, alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151', fontFamily: 'Poppins-SemiBold' },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center', fontFamily: 'Poppins-Regular' },

  // Lista
  listaProyectos: {
    gap: 14,
  },

  // CARD
  card: {
    width: '100%',
    padding: 10,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#DADADA',
    backgroundColor: '#FFFFFF',
  },

  // Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  IconProject: {
    color: '#910E16',
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
    marginRight: 6,
  },
  cardNombre: {
    color: '#910E16',
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    lineHeight: 20,
    maxWidth: '50%',
  },
  cardSeparadorTexto: {
    color: '#D1D5DB',
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginHorizontal: 6,
  },
  cardEstado: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
    marginRight: 5,
  },

  // Body
  cardBody: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cardFoto: {
    width: '48%',
    aspectRatio: 1,
    flexShrink: 0,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  cardDatos: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  datoBloque: {
    marginBottom: 4,
  },
  datoLabel: {
    color: '#9CA3AF',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  datoValor: {
    color: '#000000',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 1,
  },
  separador: {
    width: 168,
    height: 0.5,
    backgroundColor: '#DADADA',
    marginVertical: 4,
  },

  // Footer
  progresoContainer: {
    width: '100%',
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
    color: '#000000',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    marginTop: 2,
    marginLeft: 2
  },

  // Buscador
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontFamily: 'Poppins-Regular',
    paddingVertical: 2,
  },
  searchIconBtn: {
    padding: 4,
  },
  arrowBtn: {
    padding: 4,
  },
});