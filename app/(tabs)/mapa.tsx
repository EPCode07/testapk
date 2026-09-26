import { Ionicons } from '@expo/vector-icons';
import * as MapLibreRN from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppBottomNav from '../../components/AppBottomNav';
import AppHeader from '../../components/AppHeader';
import IconCamara from '../../components/IconCamara';
import IconUbicacion from '../../components/IconUbicacion';
import { encontrarMasCercano } from '../../lib/mapa/distance';
import { useUbicacion } from '../../lib/mapa/useUbicacion';
import { Proyecto, proyectoService } from '../../lib/proyectos/proyectoService';



// Radio en metros para considerar "cerca"
const RADIO_DETECCION_METROS = 200;

// Centro por defecto del mapa (cuando aún no hay ubicación del usuario)
const CENTRO_INICIAL: [number, number] = [-78.51, -7.16];

export default function MapaScreen() {
    const [busqueda, setBusqueda] = useState('');
    const [filtroActivo, setFiltroActivo] = useState<number | null>(null);
    const [detectarProyecto, setDetectarProyecto] = useState(false);
    const [proyectos, setProyectos] = useState<Proyecto[]>([]);

    const cameraRef = useRef<any>(null);

    // Carga inicial de proyectos (con manejo de error)
    useEffect(() => {
        let activo = true;
        proyectoService
            .listar()
            .then((data) => {
                if (activo) setProyectos(data);
            })
            .catch((err) => {
                console.warn('Error al listar proyectos:', err);
                showMessage({
                    message: 'No se pudieron cargar los proyectos',
                    type: 'danger',
                });
            });
        return () => {
            activo = false;
        };
    }, []);

    const {
        ubicacion,
        direccion,
        permiso,
        cargando,
        error,
        seguirUbicacion,
        empezarSeguimiento,
        detenerSeguimiento,
        obtenerUbicacionActual,
    } = useUbicacion();

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const infoAnim = useRef(new Animated.Value(0)).current;
    const livePulse = useRef(new Animated.Value(0)).current;

    // Proyectos con coordenadas válidas + filtros (búsqueda y píldora)
    const proyectosConCoords = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return proyectos
            .filter((p) => p.latitud != null && p.longitud != null)
            .filter((p) => (filtroActivo == null ? true : p.id === filtroActivo))
            .filter((p) => (texto ? p.nombre.toLowerCase().includes(texto) : true))
            .map((p) => ({
                id: p.id,
                nombre: p.nombre,
                // 🔑 Convertimos a número real, no confiamos en el tipo de TS
                latitud: Number(p.latitud),
                longitud: Number(p.longitud),
            }))
            // 🛡️ Filtramos los que no se pudieron convertir (NaN)
            .filter((p) => !Number.isNaN(p.latitud) && !Number.isNaN(p.longitud));
    }, [proyectos, busqueda, filtroActivo]);

    // Proyecto más cercano — usa la MISMA fuente que los marcadores
    const proyectoCercano = useMemo(() => {
        if (!ubicacion || !detectarProyecto) return null;
        return encontrarMasCercano(
            { latitud: ubicacion.latitud, longitud: ubicacion.longitud },
            proyectosConCoords,
            RADIO_DETECCION_METROS
        );
    }, [ubicacion, detectarProyecto, proyectosConCoords]);

    // Notificar cuando encuentra un proyecto cercano
    useEffect(() => {
        if (proyectoCercano) {
            showMessage({
                message: `📍 Estás cerca de "${proyectoCercano.punto.nombre}"`,
                description: `A ${Math.round(proyectoCercano.distancia)} m`,
                type: 'success',
                icon: 'success',
                duration: 4000,
            });
        }
    }, [proyectoCercano?.punto.id]);

    // Animación del botón de ubicación
    useEffect(() => {
        if (seguirUbicacion) {
            const anim = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            );
            anim.start();
            return () => anim.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [seguirUbicacion, pulseAnim]);

    // Cleanup: detener seguimiento al desmontar la pantalla
    useEffect(() => {
        return () => {
            detenerSeguimiento();
        };
    }, [detenerSeguimiento]);

    // Animación de entrada/salida de la tarjeta de ubicación
    useEffect(() => {
        Animated.timing(infoAnim, {
            toValue: ubicacion ? 1 : 0,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, [!!ubicacion, infoAnim]);

    // Pulso continuo del indicador "live"
    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(livePulse, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            })
        );
        loop.start();
        return () => loop.stop();
    }, [livePulse]);

    const centro: [number, number] = ubicacion
        ? [Number(ubicacion.longitud), Number(ubicacion.latitud)]
        : CENTRO_INICIAL;

    const handleUbicacionPress = async () => {
        const coords = await obtenerUbicacionActual();

        if (!coords && permiso === 'denegado') {
            Alert.alert(
                'Permiso denegado',
                'Necesitamos acceso a tu ubicación. ¿Abrir ajustes?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
                ]
            );
            return;
        }

        // Recentrar cámara en la ubicación obtenida
        if (coords) {
            cameraRef.current?.setCamera({
                centerCoordinate: [Number(coords.longitud), Number(coords.latitud)],
                zoomLevel: 15,
                animationDuration: 600,
            });
        }
    };

    const handleDetectarProyecto = (value: boolean) => {
        setDetectarProyecto(value);

        if (value) {
            empezarSeguimiento();
        } else {
            detenerSeguimiento();
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <AppHeader />

            <View style={styles.mapContainer}>
                <MapLibreRN.Map
                    style={styles.map}
                    mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
                >
                    <MapLibreRN.Camera
                        ref={cameraRef}
                        center={centro}
                        zoom={13}
                    />

                    {/* Marcadores de proyectos */}
                    {proyectosConCoords.map((p) => {
                        const esCercano = proyectoCercano?.punto.id === p.id;

                        return (
                            <MapLibreRN.Marker
                                key={p.id}
                                id={`marker-${p.id}`}
                                lngLat={[p.longitud, p.latitud]}
                            >
                                <View
                                    style={[
                                        styles.markerContainer,
                                        esCercano && styles.markerContainerCercano,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.markerInner,
                                            esCercano && styles.markerInnerCercano,
                                        ]}
                                    >
                                        <Ionicons
                                            name={esCercano ? 'flag' : 'document-text'}
                                            size={16}
                                            color="#FFFFFF"
                                        />
                                    </View>
                                </View>
                            </MapLibreRN.Marker>
                        );
                    })}

                    {/* Marcador de ubicación del usuario */}
                    {ubicacion && (
                        <MapLibreRN.Marker
                            id="mi-ubicacion"
                            lngLat={[
                                Number(ubicacion.longitud),
                                Number(ubicacion.latitud),
                            ]}
                        >
                            <View style={styles.userMarkerContainer}>
                                <View style={styles.userMarkerPulse} />
                                <View style={styles.userMarkerDot} />
                            </View>
                        </MapLibreRN.Marker>
                    )}
                </MapLibreRN.Map>

                {/* Overlay */}
                <View style={styles.overlayTop}>
                    <View style={styles.searchWrapper}>
                        <Ionicons name="search-outline" size={20} color="#6B7280" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar proyectos"
                            placeholderTextColor="#9CA3AF"
                            value={busqueda}
                            onChangeText={setBusqueda}
                        />
                        <TouchableOpacity style={styles.searchIconBtn}>
                            <Ionicons name="mic-outline" size={20} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.searchIconBtn}>
                            <Ionicons name="funnel-outline" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filtrosRow}
                    >
                        {proyectos.map((p) => {
                            const activo = filtroActivo === p.id;
                            return (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => {
                                        setFiltroActivo(activo ? null : p.id);
                                        if (p.latitud != null && p.longitud != null) {
                                            cameraRef.current?.setCamera({
                                                centerCoordinate: [
                                                    Number(p.longitud),
                                                    Number(p.latitud),
                                                ],
                                                zoomLevel: 15,
                                                animationDuration: 500,
                                            });
                                        }
                                    }}
                                    style={[
                                        styles.filtroPill,
                                        activo ? styles.filtroPillActivo : styles.filtroPillInactivo,
                                    ]}
                                >
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.filtroText,
                                            activo ? styles.filtroTextActivo : styles.filtroTextInactivo,
                                        ]}
                                    >
                                        {p.nombre}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.filtrosRow2}>
                        <View style={styles.filtroEspecial}>
                            <Text style={styles.filtroEspecialText}>Detectar proyecto</Text>
                            <Switch
                                value={detectarProyecto}
                                onValueChange={handleDetectarProyecto}
                                trackColor={{ false: '#D1D5DB', true: '#B5121B' }}
                                thumbColor="#FFFFFF"
                                ios_backgroundColor="#D1D5DB"
                                style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                            />
                        </View>

                        <View style={{ flex: 1 }} />

                        <TouchableOpacity style={styles.filtroEspecial}>
                            <Text style={styles.filtroEspecialText}>Vista de mapa</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* TARJETA: info del proyecto cercano */}
                {proyectoCercano && (
                    <View style={styles.infoProyectoCercano}>
                        <View style={styles.infoProyectoHeader}>
                            <View style={styles.infoProyectoDot} />
                            <Text style={styles.infoProyectoTitulo}>
                                {proyectoCercano.punto.nombre}
                            </Text>
                        </View>
                        <Text style={styles.infoProyectoDistancia}>
                            📏 A {Math.round(proyectoCercano.distancia)} m de tu ubicación
                        </Text>
                        <TouchableOpacity
                            style={styles.infoProyectoBtn}
                            onPress={() => router.push(`/proyecto/${proyectoCercano.punto.id}` as any)}
                        >
                            <Text style={styles.infoProyectoBtnText}>Ver proyecto</Text>
                            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Tarjeta de ubicación (única, fuera del Map) */}
                {ubicacion && (
                    <Animated.View
                        style={[
                            styles.infoUbicacion,
                            {
                                opacity: infoAnim,
                                transform: [
                                    {
                                        translateY: infoAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [12, 0],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        {/* Header: icono + nombre + live */}
                        <View style={styles.infoHeader}>
                            <View style={styles.infoIconCircle}>
                                <Ionicons name="location" size={18} color="#FFFFFF" />
                            </View>

                            <View style={styles.infoTextWrapper}>
                                <Text style={styles.infoNombre} numberOfLines={1}>
                                    {direccion?.nombre ?? 'Obteniendo dirección...'}
                                </Text>
                                <Text style={styles.infoCoords}>
                                    {ubicacion.latitud.toFixed(5)}, {ubicacion.longitud.toFixed(5)}
                                </Text>
                            </View>

                            <View style={styles.liveWrapper}>
                                <Animated.View
                                    style={[
                                        styles.livePulse,
                                        {
                                            opacity: livePulse.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.6, 0],
                                            }),
                                            transform: [
                                                {
                                                    scale: livePulse.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.8, 2.2],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                />
                                <View style={styles.liveDot} />
                            </View>
                        </View>

                        {/* Sección: proyectos reales */}
                        {proyectos.length > 0 && (
                            <View style={styles.proyectosSection}>
                                <View style={styles.proyectosHeader}>
                                    <Ionicons name="folder-open-outline" size={12} color="#6B7280" />
                                    <Text style={styles.proyectosHeaderText}>
                                        Proyectos ({proyectos.length})
                                    </Text>
                                </View>

                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.proyectosScroll}
                                >
                                    {proyectos.map((p) => {
                                        const activo = filtroActivo === p.id;
                                        return (
                                            <TouchableOpacity
                                                key={p.id}
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    setFiltroActivo(activo ? null : p.id);
                                                    if (p.latitud != null && p.longitud != null) {
                                                        cameraRef.current?.setCamera({
                                                            centerCoordinate: [
                                                                Number(p.longitud),
                                                                Number(p.latitud),
                                                            ],
                                                            zoomLevel: 15,
                                                            animationDuration: 500,
                                                        });
                                                    }
                                                }}
                                                style={[
                                                    styles.proyectoPill,
                                                    activo && styles.proyectoPillActivo,
                                                ]}
                                            >
                                                <View
                                                    style={[
                                                        styles.proyectoPillDot,
                                                        activo && styles.proyectoPillDotActivo,
                                                    ]}
                                                />
                                                <Text
                                                    numberOfLines={1}
                                                    style={[
                                                        styles.proyectoPillText,
                                                        activo && styles.proyectoPillTextActivo,
                                                    ]}
                                                >
                                                    {p.nombre}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}
                    </Animated.View>
                )}

                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Botones flotantes */}
                <View style={styles.floatingButtons}>
                    <TouchableOpacity
                        style={styles.floatingBtnLight}
                        onPress={handleUbicacionPress}
                        disabled={cargando}
                    >
                        {cargando ? (
                            <ActivityIndicator size="small" color="#111827" />
                        ) : (
                            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                <IconUbicacion size={26} color="#111827" />
                            </Animated.View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.floatingBtnRed}
                        onPress={() => router.push('/camera' as any)}
                    >
                        <IconCamara size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <AppBottomNav active="mapa" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    mapContainer: { flex: 1 },
    map: { flex: 1 },

    overlayTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 12,
        gap: 10,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        fontFamily: 'Poppins-Regular',
        paddingVertical: 2,
    },
    searchIconBtn: { padding: 4 },

    filtrosRow: { gap: 8, paddingBottom: 8 },
    filtroPill: {
        borderRadius: 10,
        height: 35,
        paddingHorizontal: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    filtroPillActivo: {
        borderWidth: 2,
        borderColor: '#B5121B',
        backgroundColor: '#910E16',
    },
    filtroPillInactivo: {
        borderWidth: 1,
        borderColor: '#FFFFFF',
        backgroundColor: '#FFFFFF',
    },
    filtroText: { fontFamily: 'Poppins-Regular', fontSize: 13 },
    filtroTextActivo: { color: '#FFFFFF', fontWeight: '600' },
    filtroTextInactivo: { color: '#374151', fontWeight: '500' },

    filtrosRow2: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    filtroEspecial: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        height: 35,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    filtroEspecialText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#374151',
    },

    // Marcadores
    markerContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    markerContainerCercano: {
        transform: [{ scale: 1.15 }],
    },
    markerInner: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#7C3AED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerInnerCercano: {
        backgroundColor: '#B5121B',
    },

    userMarkerContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userMarkerPulse: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
    },
    userMarkerDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#2563EB',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },

    // Botones flotantes
    floatingButtons: {
        position: 'absolute',
        bottom: 24,
        right: 16,
        gap: 12,
    },
    floatingBtnLight: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    floatingBtnRed: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#B5121B',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },

    // Info proyecto cercano
    infoProyectoCercano: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        borderLeftWidth: 4,
        borderLeftColor: '#B5121B',
    },
    infoProyectoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    infoProyectoDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#B5121B',
    },
    infoProyectoTitulo: {
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
        color: '#111827',
        flex: 1,
    },
    infoProyectoDistancia: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 10,
    },
    infoProyectoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#B5121B',
        borderRadius: 8,
        paddingVertical: 8,
    },
    infoProyectoBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },

    // Info ubicación (tarjeta profesional)
    infoUbicacion: {
        position: 'absolute',
        top: 200,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    infoIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#B5121B',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoTextWrapper: { flex: 1 },
    infoNombre: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#111827',
        marginBottom: 1,
    },
    infoCoords: {
        fontFamily: 'Poppins-Regular',
        fontSize: 10.5,
        color: '#6B7280',
    },
    liveWrapper: {
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    livePulse: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22C55E',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22C55E',
    },

    // Proyectos dentro de la tarjeta
    proyectosSection: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
    },
    proyectosHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    proyectosHeaderText: {
        fontFamily: 'Poppins-Medium',
        fontSize: 10.5,
        color: '#6B7280',
        letterSpacing: 0.3,
    },
    proyectosScroll: {
        gap: 6,
        paddingRight: 4,
    },
    proyectoPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent',
        maxWidth: 160,
    },
    proyectoPillActivo: {
        backgroundColor: '#FEF2F2',
        borderColor: '#B5121B',
    },
    proyectoPillDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#9CA3AF',
    },
    proyectoPillDotActivo: {
        backgroundColor: '#B5121B',
    },
    proyectoPillText: {
        fontFamily: 'Poppins-Medium',
        fontSize: 11,
        color: '#374151',
    },
    proyectoPillTextActivo: {
        color: '#B5121B',
        fontFamily: 'Poppins-SemiBold',
    },

    errorBanner: {
        position: 'absolute',
        top: 160,
        left: 16,
        right: 16,
        backgroundColor: '#FEE2E2',
        padding: 10,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
    },
    errorText: {
        fontSize: 12,
        color: '#991B1B',
        fontFamily: 'Poppins-Regular',
    },
});