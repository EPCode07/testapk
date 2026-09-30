import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import AppHeader from '../../../components/AppHeader';
import {
    EstacionGaleriaItem,
    FotoGaleria,
    galeriaService,
    GrupoFechaFotos,
} from '../../../lib/galeria/galeriaService';

const { width } = Dimensions.get('window');
const PHOTO_GAP = 10;
const PHOTO_WIDTH = (width - 32 - 28 - PHOTO_GAP) / 2;

export default function GaleriaEstacionScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        id: string;
        proyectoId?: string;
        estacionNombre?: string;
        estacionCodigo?: string;
        proyectoNombre?: string;
    }>();

    const estacionId = params.id ? Number(params.id) : null;
    const proyectoId = params.proyectoId ? Number(params.proyectoId) : null;

    const [gruposFecha, setGruposFecha] = useState<GrupoFechaFotos[]>([]);
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [tabActivo, setTabActivo] = useState<'local' | 'compartidas'>('local');
    const [busqueda, setBusqueda] = useState('');
    const [isListening, setIsListening] = useState(false);

    const [estacionesDisponibles, setEstacionesDisponibles] = useState<EstacionGaleriaItem[]>([]);
    const [modalEstacionesVisible, setModalEstacionesVisible] = useState(false);
    const [fotoSeleccionada, setFotoSeleccionada] = useState<FotoGaleria | null>(null);

    useSpeechRecognitionEvent('start', () => setIsListening(true));
    useSpeechRecognitionEvent('end', () => setIsListening(false));
    useSpeechRecognitionEvent('error', () => setIsListening(false));
    useSpeechRecognitionEvent('result', (event) => {
        const texto = event.results[0]?.transcript;
        if (texto) setBusqueda(texto);
    });

    const cargarFotos = useCallback(
        async (id: number, soloCompartidas: boolean) => {
            try {
                const [grupos, resProyecto] = await Promise.all([
                    galeriaService.listarFotosDeEstacionPorFecha(id, soloCompartidas),
                    proyectoId
                        ? galeriaService.listarEstacionesDeProyecto(proyectoId).catch(() => null)
                        : null,
                ]);
                setGruposFecha(grupos);
                if (resProyecto) {
                    setEstacionesDisponibles(resProyecto.estaciones);
                }
            } catch (err) {
                console.log('Error cargando fotos de estación:', err);
            } finally {
                setCargando(false);
                setRefrescando(false);
            }
        },
        [proyectoId]
    );

    useEffect(() => {
        if (estacionId) {
            setCargando(true);
            cargarFotos(estacionId, tabActivo === 'compartidas');
        }
    }, [estacionId, tabActivo, cargarFotos]);

    const onRefresh = () => {
        if (!estacionId) return;
        setRefrescando(true);
        cargarFotos(estacionId, tabActivo === 'compartidas');
    };

    const cambiarEstacion = (nuevaEstacion: EstacionGaleriaItem) => {
        setModalEstacionesVisible(false);
        router.replace({
            pathname: '/galeria/estacion/[id]',
            params: {
                id: String(nuevaEstacion.id),
                proyectoId: String(proyectoId ?? ''),
                estacionNombre: nuevaEstacion.nombre,
                estacionCodigo: nuevaEstacion.codigo,
                proyectoNombre: params.proyectoNombre ?? '',
            },
        });
    };

    const handleCompartir = async (foto: FotoGaleria) => {
        try {
            await Share.share({
                title: 'Foto de estación ' + (params.estacionNombre ?? ''),
                message: `Foto de actividad: ${foto.actividadNombre ?? ''}\nFecha: ${new Date(
                    foto.timestamp || foto.creadoEn
                ).toLocaleString('es-PE')}`,
                url: foto.uriLocal,
            });
        } catch (err) {
            console.log('Error al compartir foto:', err);
        }
    };

    const gruposFiltrados = gruposFecha
        .map((grupo) => {
            if (!busqueda.trim()) return grupo;
            const q = busqueda.toLowerCase().trim();
            const fotosMatch = grupo.fotos.filter(
                (f) =>
                    (f.descripcionIndividual ?? '').toLowerCase().includes(q) ||
                    (f.actividadNombre ?? '').toLowerCase().includes(q) ||
                    (f.direccion ?? '').toLowerCase().includes(q)
            );
            return {
                ...grupo,
                fotos: fotosMatch,
                totalFotos: fotosMatch.length,
            };
        })
        .filter((grupo) => grupo.fotos.length > 0);

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
                    {/* DROPDOWN SELECTOR DE PROYECTO | ESTACIÓN */}
                    <TouchableOpacity
                        style={styles.stationDropdown}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (estacionesDisponibles.length > 0) {
                                setModalEstacionesVisible(true);
                            }
                        }}
                    >
                        <View style={styles.dropdownLeft}>
                            <View style={styles.redDot} />
                            <Text style={styles.dropdownTitle} numberOfLines={1}>
                                <Text style={styles.dropdownProj}>
                                    {params.proyectoNombre || 'Proyecto'}
                                </Text>
                                {' | '}
                                <Text style={styles.dropdownEst}>
                                    {params.estacionNombre || 'Estación'}
                                </Text>
                            </Text>
                        </View>
                        {estacionesDisponibles.length > 0 && (
                            <Ionicons name="chevron-down" size={20} color="#374151" />
                        )}
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

                    {/* SELECTOR DE PESTAÑAS: LOCAL / COMPARTIDAS */}
                    <View style={styles.tabsRow}>
                        <TouchableOpacity
                            style={[
                                styles.pillTab,
                                tabActivo === 'local' ? styles.pillTabActive : styles.pillTabInactive,
                            ]}
                            activeOpacity={0.8}
                            onPress={() => setTabActivo('local')}
                        >
                            <Ionicons
                                name="camera-outline"
                                size={18}
                                color={tabActivo === 'local' ? '#FFFFFF' : '#6B7280'}
                            />
                            <Text
                                style={[
                                    styles.pillTabText,
                                    tabActivo === 'local'
                                        ? styles.pillTabTextActive
                                        : styles.pillTabTextInactive,
                                ]}
                            >
                                Local
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.pillTab,
                                tabActivo === 'compartidas'
                                    ? styles.pillTabActive
                                    : styles.pillTabInactive,
                            ]}
                            activeOpacity={0.8}
                            onPress={() => setTabActivo('compartidas')}
                        >
                            <Ionicons
                                name="cloud-done-outline"
                                size={18}
                                color={tabActivo === 'compartidas' ? '#FFFFFF' : '#6B7280'}
                            />
                            <Text
                                style={[
                                    styles.pillTabText,
                                    tabActivo === 'compartidas'
                                        ? styles.pillTabTextActive
                                        : styles.pillTabTextInactive,
                                ]}
                            >
                                Compartidas
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* LISTADO DE FOTOS POR FECHA */}
                    {cargando ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#B5121B" />
                            <Text style={styles.loadingText}>Cargando fotos...</Text>
                        </View>
                    ) : gruposFiltrados.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="images-outline" size={56} color="#9CA3AF" />
                            <Text style={styles.emptyTitle}>Sin fotos registradas</Text>
                            <Text style={styles.emptySubtitle}>
                                {tabActivo === 'compartidas'
                                    ? 'Aún no hay fotos sincronizadas con el servidor.'
                                    : 'Esta estación no tiene fotos guardadas todavía.'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.sectionsContainer}>
                            {gruposFiltrados.map((grupo) => (
                                <View key={grupo.fechaClave} style={styles.dateCard}>
                                    <Text style={styles.dateTitle}>{grupo.titulo}</Text>
                                    <Text style={styles.dateSubtitle}>
                                        {grupo.totalFotos} {grupo.totalFotos === 1 ? 'foto' : 'fotos'}
                                    </Text>

                                    <View style={styles.photosGrid}>
                                        {grupo.fotos.map((foto) => (
                                            <TouchableOpacity
                                                key={foto.idLocal}
                                                style={styles.photoBox}
                                                activeOpacity={0.85}
                                                onPress={() => setFotoSeleccionada(foto)}
                                            >
                                                <Image
                                                    source={{ uri: foto.uriLocal }}
                                                    style={styles.photoImg}
                                                    resizeMode="cover"
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>

                {/* MODAL CAMBIAR ESTACIÓN */}
                <Modal
                    visible={modalEstacionesVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setModalEstacionesVisible(false)}
                >
                    <TouchableOpacity
                        style={[
                            styles.modalOverlay,
                            {
                                paddingTop: 24 + insets.top,
                                paddingBottom: 24 + insets.bottom,
                            },
                        ]}
                        activeOpacity={1}
                        onPress={() => setModalEstacionesVisible(false)}
                    >
                        <View style={styles.modalContent}>
                            <Text style={styles.modalHeaderTitle}>Seleccionar Estación</Text>
                            <ScrollView style={{ maxHeight: 350 }}>
                                {estacionesDisponibles.map((e) => {
                                    const esActual = e.id === estacionId;
                                    return (
                                        <TouchableOpacity
                                            key={e.id}
                                            style={[styles.modalItem, esActual && styles.modalItemActive]}
                                            onPress={() => cambiarEstacion(e)}
                                        >
                                            <Ionicons
                                                name="location"
                                                size={18}
                                                color={esActual ? '#B5121B' : '#6B7280'}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={[
                                                        styles.modalItemText,
                                                        esActual && styles.modalItemTextActive,
                                                    ]}
                                                >
                                                    {e.nombre}
                                                </Text>
                                                <Text style={styles.modalItemSub}>
                                                    {e.totalFotos} fotos
                                                </Text>
                                            </View>
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

                {/* MODAL VISOR DE FOTO */}
                <Modal
                    visible={!!fotoSeleccionada}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setFotoSeleccionada(null)}
                >
                    {fotoSeleccionada && (
                        <View style={styles.photoViewerOverlay}>
                            <StatusBar barStyle="light-content" backgroundColor="#000000" />

                            <View
                                style={[
                                    styles.viewerHeader,
                                    { paddingTop: insets.top + 12 },
                                ]}
                            >
                                <TouchableOpacity
                                    onPress={() => setFotoSeleccionada(null)}
                                    style={styles.viewerIconBtn}
                                >
                                    <Ionicons name="close" size={26} color="#FFFFFF" />
                                </TouchableOpacity>
                                <Text style={styles.viewerTitle} numberOfLines={1}>
                                    {fotoSeleccionada.actividadNombre || 'Foto'}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => handleCompartir(fotoSeleccionada)}
                                    style={styles.viewerIconBtn}
                                >
                                    <Ionicons name="share-social-outline" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.viewerImageWrapper}>
                                <Image
                                    source={{ uri: fotoSeleccionada.uriLocal }}
                                    style={styles.viewerImage}
                                    resizeMode="contain"
                                />
                            </View>

                            <View
                                style={[
                                    styles.viewerDetails,
                                    { paddingBottom: insets.bottom + 20 },
                                ]}
                            >
                                {fotoSeleccionada.descripcionIndividual && (
                                    <Text style={styles.viewerDesc}>
                                        {fotoSeleccionada.descripcionIndividual}
                                    </Text>
                                )}
                                <View style={styles.viewerMetaRow}>
                                    <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                                    <Text style={styles.viewerMetaText}>
                                        {new Date(
                                            fotoSeleccionada.timestamp || fotoSeleccionada.creadoEn
                                        ).toLocaleString('es-PE')}
                                    </Text>
                                </View>
                                {fotoSeleccionada.latitud != null && fotoSeleccionada.longitud != null && (
                                    <View style={styles.viewerMetaRow}>
                                        <Ionicons name="location-outline" size={16} color="#9CA3AF" />
                                        <Text style={styles.viewerMetaText}>
                                            GPS: {Number(fotoSeleccionada.latitud).toFixed(5)},{' '}
                                            {Number(fotoSeleccionada.longitud).toFixed(5)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
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

    // DROPDOWN ESTACIÓN
    stationDropdown: {
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
        fontSize: 14,
        flex: 1,
    },
    dropdownProj: {
        color: '#8A151B',
    },
    dropdownEst: {
        color: '#8A151B',
    },

    // BUSCADOR
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 14,
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

    // PILLS TABS
    tabsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    pillTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    pillTabActive: {
        backgroundColor: '#8A151B',
    },
    pillTabInactive: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    pillTabText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
    pillTabTextActive: {
        color: '#FFFFFF',
    },
    pillTabTextInactive: {
        color: '#6B7280',
    },

    // SECCIONES DE FECHA
    sectionsContainer: {
        gap: 14,
    },
    dateCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    dateTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
        color: '#8A151B',
    },
    dateSubtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 12,
    },
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: PHOTO_GAP,
    },
    photoBox: {
        width: PHOTO_WIDTH,
        height: 125,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F3F4F6',
    },
    photoImg: {
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

    // MODAL ESTACIONES
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
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
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#374151',
    },
    modalItemTextActive: {
        fontFamily: 'Poppins-SemiBold',
        color: '#B5121B',
    },
    modalItemSub: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#9CA3AF',
    },

    // VISOR DE FOTO
    photoViewerOverlay: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'space-between',
    },
    viewerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    viewerIconBtn: {
        padding: 8,
    },
    viewerTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
        color: '#FFFFFF',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 8,
    },
    viewerImageWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerImage: {
        width: '100%',
        height: '100%',
    },
    viewerDetails: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        gap: 8,
    },
    viewerDesc: {
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#FFFFFF',
        marginBottom: 4,
    },
    viewerMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    viewerMetaText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#D1D5DB',
    },
});