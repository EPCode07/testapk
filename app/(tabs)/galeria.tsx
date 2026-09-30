import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
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
import AppHeader from '../../components/AppHeader';
import { galeriaService, ProyectoGaleriaItem } from '../../lib/galeria/galeriaService';

const FOTO_DEFAULT =
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - 32 - CARD_GAP) / 2;

export default function GaleriaScreen() {
    const [proyectos, setProyectos] = useState<ProyectoGaleriaItem[]>([]);
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [isListening, setIsListening] = useState(false);

    useSpeechRecognitionEvent('start', () => setIsListening(true));
    useSpeechRecognitionEvent('end', () => setIsListening(false));
    useSpeechRecognitionEvent('error', () => setIsListening(false));
    useSpeechRecognitionEvent('result', (event) => {
        const texto = event.results[0]?.transcript;
        if (texto) setBusqueda(texto);
    });

    const cargar = useCallback(async () => {
        try {
            const lista = await galeriaService.listarProyectosConFotos();
            setProyectos(lista);
        } catch (err) {
            console.log('Error cargando galería de proyectos:', err);
        } finally {
            setCargando(false);
            setRefrescando(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            cargar();
        }, [cargar])
    );

    const onRefresh = () => {
        setRefrescando(true);
        cargar();
    };

    const filtrados = proyectos.filter((p) => {
        if (!busqueda.trim()) return true;
        const q = busqueda.toLowerCase().trim();
        return (
            p.nombre.toLowerCase().includes(q) ||
            p.codigo.toLowerCase().includes(q) ||
            p.cliente.toLowerCase().includes(q)
        );
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

                    {cargando ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#B5121B" />
                            <Text style={styles.loadingText}>Cargando galería...</Text>
                        </View>
                    ) : filtrados.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="images-outline" size={56} color="#9CA3AF" />
                            <Text style={styles.emptyTitle}>
                                {busqueda ? 'Sin coincidencias' : 'Sin proyectos'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {busqueda
                                    ? 'No se encontraron proyectos para tu búsqueda.'
                                    : 'Aún no hay proyectos registrados.'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.gridContainer}>
                            {filtrados.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.card}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                        router.push({
                                            pathname: '/galeria/proyecto/[id]',
                                            params: { id: String(item.id), nombre: item.nombre },
                                        })
                                    }
                                >
                                    {/* Cabecera de la tarjeta con punto rojo */}
                                    <View style={styles.cardHeader}>
                                        <View style={styles.redDot} />
                                        <Text style={styles.cardTitle} numberOfLines={1}>
                                            {item.nombre}
                                        </Text>
                                    </View>

                                    {/* Subtítulo: total fotos y tiempo relativo */}
                                    <Text style={styles.cardSubtitle}>
                                        {item.totalFotos} {item.totalFotos === 1 ? 'foto' : 'fotos'}
                                        {item.totalFotos > 0 ? ` | ${item.tiempoRelativo}` : ''}
                                    </Text>

                                    {/* Imagen de portada */}
                                    <View style={styles.imageContainer}>
                                        <Image
                                            source={{ uri: item.ultimaFotoUri || FOTO_DEFAULT }}
                                            style={styles.cardImage}
                                            resizeMode="cover"
                                        />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </ScrollView>
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

    // GRID
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CARD_GAP,
    },
    card: {
        width: CARD_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    redDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#B5121B',
    },
    cardTitle: {
        flex: 1,
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
        color: '#8A151B',
    },
    cardSubtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#6B7280',
        marginBottom: 8,
    },
    imageContainer: {
        width: '100%',
        height: 125,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F3F4F6',
    },
    cardImage: {
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
});
