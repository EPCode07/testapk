import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import AppHeader from '../../../components/AppHeader';
import { EstacionGaleriaItem, galeriaService, ProyectoGaleriaItem } from '../../../lib/galeria/galeriaService';

const FOTO_DEFAULT =
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800';

export default function GaleriaProyectoScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id: string; nombre?: string }>();
    const proyectoId = params.id ? Number(params.id) : null;

    const [proyectoActual, setProyectoActual] = useState<{
        id: number;
        nombre: string;
        codigo: string;
    } | null>(null);
    const [estaciones, setEstaciones] = useState<EstacionGaleriaItem[]>([]);
    const [proyectosDisponibles, setProyectosDisponibles] = useState<ProyectoGaleriaItem[]>([]);
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [modalProyectosVisible, setModalProyectosVisible] = useState(false);

    useSpeechRecognitionEvent('start', () => setIsListening(true));
    useSpeechRecognitionEvent('end', () => setIsListening(false));
    useSpeechRecognitionEvent('error', () => setIsListening(false));
    useSpeechRecognitionEvent('result', (event) => {
        const texto = event.results[0]?.transcript;
        if (texto) setBusqueda(texto);
    });

    const cargarDatos = useCallback(async (id: number) => {
        try {
            const [resultado, listaProyectos] = await Promise.all([
                galeriaService.listarEstacionesDeProyecto(id),
                galeriaService.listarProyectosConFotos(),
            ]);
            setProyectoActual(resultado.proyecto);
            setEstaciones(resultado.estaciones);
            setProyectosDisponibles(listaProyectos);
        } catch (err) {
            console.log('Error cargando estaciones del proyecto:', err);
        } finally {
            setCargando(false);
            setRefrescando(false);
        }
    }, []);

    useEffect(() => {
        if (proyectoId) {
            setCargando(true);
            cargarDatos(proyectoId);
        }
    }, [proyectoId, cargarDatos]);

    const onRefresh = () => {
        if (!proyectoId) return;
        setRefrescando(true);
        cargarDatos(proyectoId);
    };

    const cambiarProyecto = (nuevoId: number) => {
        setModalProyectosVisible(false);
        router.replace({
            pathname: '/galeria/proyecto/[id]',
            params: { id: String(nuevoId) },
        });
    };

    const filtradas = estaciones.filter((e) => {
        if (!busqueda.trim()) return true;
        const q = busqueda.toLowerCase().trim();
        return e.nombre.toLowerCase().includes(q) || e.codigo.toLowerCase().includes(q);
    });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.mainWrapper}>
                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />
                <AppHeader variant="main" />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refrescando}
                            onRefresh={onRefresh}
                            colors={['#B5121B']}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {/* DROPDOWN SELECTOR DE PROYECTO */}
                    <TouchableOpacity
                        style={styles.projectDropdown}
                        activeOpacity={0.8}
                        onPress={() => setModalProyectosVisible(true)}
                    >
                        <View style={styles.dropdownLeft}>
                            <View style={styles.redDot} />
                            <Text style={styles.dropdownTitle} numberOfLines={1}>
                                {proyectoActual?.nombre ?? params.nombre ?? 'Seleccionar proyecto'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-down" size={20} color="#374151" />
                    </TouchableOpacity>

                    {/* BUSCADOR */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar fotos"
                            placeholderTextColor="#9CA3AF"
                            value={busqueda}
                            onChangeText={setBusqueda}
                        />
                        {busqueda.length > 0 && (
                            <TouchableOpacity onPress={() => setBusqueda('')} style={styles.clearBtn}>
                                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.searchActionBtn}>
                            <Ionicons
                                name="mic-outline"
                                size={20}
                                color={isListening ? '#B5121B' : '#6B7280'}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.searchActionBtn}>
                            <Ionicons name="funnel-outline" size={19} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* CONTENIDO DE ESTACIONES */}
                    {cargando ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#B5121B" />
                            <Text style={styles.loadingText}>Cargando estaciones...</Text>
                        </View>
                    ) : filtradas.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="location-outline" size={56} color="#9CA3AF" />
                            <Text style={styles.emptyTitle}>
                                {busqueda ? 'Sin coincidencias' : 'Sin estaciones'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {busqueda
                                    ? 'No se encontraron estaciones para tu búsqueda.'
                                    : 'Este proyecto no tiene estaciones registradas.'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.stationsList}>
                            {filtradas.map((estacion) => (
                                <TouchableOpacity
                                    key={estacion.id}
                                    style={styles.stationCard}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                        router.push({
                                            pathname: '/galeria/estacion/[id]',
                                            params: {
                                                id: String(estacion.id),
                                                proyectoId: String(proyectoActual?.id ?? proyectoId),
                                                estacionNombre: estacion.nombre,
                                                estacionCodigo: estacion.codigo,
                                                proyectoNombre: proyectoActual?.nombre ?? '',
                                            },
                                        })
                                    }
                                >
                                    {/* Cabecera de la estación con título y flecha */}
                                    <View style={styles.stationHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.stationTitle}>
                                                {estacion.nombre}
                                            </Text>
                                            <Text style={styles.stationSubtitle}>
                                                {estacion.totalFotos}{' '}
                                                {estacion.totalFotos === 1 ? 'foto' : 'fotos'}
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name="arrow-forward"
                                            size={22}
                                            color="#111827"
                                        />
                                    </View>

                                    {/* Previews de fotos de la estación */}
                                    <View style={styles.previewsRow}>
                                        {estacion.fotosPreview.length > 0 ? (
                                            estacion.fotosPreview.slice(0, 2).map((foto, index) => (
                                                <View key={foto.idLocal || index} style={styles.previewBox}>
                                                    <Image
                                                        source={{ uri: foto.uriLocal }}
                                                        style={styles.previewImage}
                                                        resizeMode="cover"
                                                    />
                                                </View>
                                            ))
                                        ) : (
                                            <>
                                                <View style={styles.previewBox}>
                                                    <Image
                                                        source={{ uri: FOTO_DEFAULT }}
                                                        style={styles.previewImage}
                                                        resizeMode="cover"
                                                    />
                                                </View>
                                                <View style={styles.previewBox}>
                                                    <Image
                                                        source={{ uri: FOTO_DEFAULT }}
                                                        style={styles.previewImage}
                                                        resizeMode="cover"
                                                    />
                                                </View>
                                            </>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </ScrollView>

                {/* MODAL CAMBIAR PROYECTO */}
                <Modal
                    visible={modalProyectosVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setModalProyectosVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setModalProyectosVisible(false)}
                    >
                        <View style={styles.modalContent}>
                            <Text style={styles.modalHeaderTitle}>Seleccionar Proyecto</Text>
                            <ScrollView style={{ maxHeight: 350 }}>
                                {proyectosDisponibles.map((p) => {
                                    const esActual = p.id === proyectoActual?.id;
                                    return (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[styles.modalItem, esActual && styles.modalItemActive]}
                                            onPress={() => cambiarProyecto(p.id)}
                                        >
                                            <View style={styles.redDot} />
                                            <Text
                                                style={[
                                                    styles.modalItemText,
                                                    esActual && styles.modalItemTextActive,
                                                ]}
                                            >
                                                {p.nombre}
                                            </Text>
                                            {esActual && (
                                                <Ionicons name="checkmark" size={20} color="#B5121B" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    mainWrapper: {
        flex: 1,
        backgroundColor: '#ECEDEF',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 24,
    },

    // DROPDOWN PROYECTO
    projectDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    dropdownLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        marginRight: 8,
    },
    redDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#B5121B',
    },
    dropdownTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
        color: '#8A151B',
        flex: 1,
    },

    // BUSCADOR
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        marginRight: 6,
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#111827',
        paddingVertical: 0,
    },
    clearBtn: {
        padding: 4,
    },
    searchActionBtn: {
        padding: 6,
        marginLeft: 4,
    },

    // LISTA DE ESTACIONES
    stationsList: {
        gap: 14,
    },
    stationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    stationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    stationTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
        color: '#8A151B',
    },
    stationSubtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    previewsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    previewBox: {
        flex: 1,
        height: 120,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F3F4F6',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },

    center: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    loadingText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#6B7280',
    },
    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 8,
    },
    emptyTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
        color: '#374151',
        marginTop: 8,
    },
    emptySubtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingHorizontal: 24,
    },

    // MODAL
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    modalHeaderTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
        color: '#111827',
        marginBottom: 14,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 10,
    },
    modalItemActive: {
        backgroundColor: '#FEF2F2',
    },
    modalItemText: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#374151',
    },
    modalItemTextActive: {
        fontFamily: 'Poppins-SemiBold',
        color: '#B5121B',
    },
});
