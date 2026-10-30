import AppHeader from '@/components/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import WatermarkCard from '../components/WatermarkCard';
import { useActividad } from '../lib/actividades/ActividadContext';
import { DireccionInfo, obtenerDireccion } from '../lib/location/reverseGeocode';

// ── Tokens de diseño ─────────────────────────────────────────────
const BRAND = '#910E16';
const BRAND_SOFT = '#FEF2F2';
const BRAND_BORDER = '#FCA5A5';
const GAP = 10;
const SIDE_PADDING = 16;
const COLUMNS = 3;

export default function UploadPhotoScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const { estacion_servicio_actividad_id } = useLocalSearchParams();
    const { cargarActividadEnCurso, agregarFotoActividad } = useActividad();
    const params = useLocalSearchParams<{ estacion_servicio_actividad_id?: string | string[] }>();
    const idRaw = params.estacion_servicio_actividad_id;
    const tareaId = Array.isArray(idRaw) ? idRaw[0] : idRaw;

    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [processingUri, setProcessingUri] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<any>(null);
    const [direccionActual, setDireccionActual] = useState<DireccionInfo | null>(null);

    const viewShotRef = useRef<any>(null);
    const imageLoadedRef = useRef(false);

    // Tamaño exacto de cada miniatura: 3 columnas siempre alineadas
    const itemSize = Math.floor((screenWidth - SIDE_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
    const footerBottom = Math.max(insets.bottom, 12) + 8;

    useEffect(() => {
        if (estacion_servicio_actividad_id) {
            cargarActividadEnCurso(Number(estacion_servicio_actividad_id));
        }

        const fetchUbicacion = async () => {
            try {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                setCurrentLocation(loc);
                const dir = await obtenerDireccion(loc.coords.latitude, loc.coords.longitude);
                if (dir) setDireccionActual(dir);
            } catch (error) {
                console.warn("Error al obtener ubicación");
            }
        };
        fetchUbicacion();
    }, [estacion_servicio_actividad_id]);

    // 1. Lógica para agregar imágenes (sin borrar las anteriores)
    const pickImages = async () => {
        // 1. Solicitar permiso de ubicación
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Permiso denegado',
                'Necesitamos acceso a tu ubicación para colocar la marca de agua en las fotos. Puedes activarlo en los ajustes de tu teléfono.'
            );
            // Opcional: Puedes decidir si continuar sin ubicación o detener el flujo aquí.
            // return; 
        } else {
            // 2. Si nos da permiso, obtenemos la ubicación fresca
            try {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                setCurrentLocation(loc);

                const dir = await obtenerDireccion(loc.coords.latitude, loc.coords.longitude);
                if (dir) setDireccionActual(dir);
            } catch (error) {
                console.warn("No se pudo obtener la ubicación al momento de subir", error);
            }
        }

        // 3. Finalmente, abrimos la galería
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            const nuevasUris = result.assets.map(a => a.uri);
            setSelectedImages(prev => {
                const combinadas = [...prev, ...nuevasUris];
                return Array.from(new Set(combinadas));
            });
        }
    };

    // 2. Lógica para eliminar una imagen específica
    const removeImage = (uriToRemove: string) => {
        setSelectedImages(prev => prev.filter(uri => uri !== uriToRemove));
    };

    const handleSave = async () => {
        if (selectedImages.length === 0 || processing) return;
        setProcessing(true);

        try {
            const urisToProcess = [...selectedImages];

            for (const uri of urisToProcess) {
                setProcessingUri(uri);
                imageLoadedRef.current = false;

                await new Promise<void>((resolve) => {
                    let elapsed = 0;
                    const check = setInterval(() => {
                        elapsed += 100;
                        if (imageLoadedRef.current || elapsed >= 3000) {
                            clearInterval(check);
                            resolve();
                        }
                    }, 100);
                });

                await new Promise(r => setTimeout(r, 300));

                let finalUri = uri;
                if (viewShotRef.current) {
                    finalUri = await viewShotRef.current.capture();
                }

                await agregarFotoActividad({
                    uriLocal: finalUri,
                    timestamp: new Date().toISOString(),
                    latitud: currentLocation?.coords?.latitude ?? null,
                    longitud: currentLocation?.coords?.longitude ?? null,
                    altitud: currentLocation?.coords?.altitude,
                    precision: currentLocation?.coords?.accuracy,
                });
            }

            Alert.alert("Éxito", "Fotos agregadas a la tarea.");
            router.replace({
                pathname: '/photo-album',
                params: { id: String(tareaId || '') } // Aseguramos que sea un string limpio
            } as any);

        } catch (error) {
            Alert.alert("Error", "No se pudieron procesar las fotos.");
            console.error(error);
        } finally {
            setProcessingUri(null);
            setProcessing(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* <StatusBar barStyle="dark-content" backgroundColor="#FFF" /> */}

            <View style={{ backgroundColor: '#ECEDEF', flex: 1 }}>


                <StatusBar barStyle="dark-content" backgroundColor="#ffffffff" />

                <AppHeader variant="back" title="Subir Fotos" />


                {/* <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={22} color="#374151" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title} numberOfLines={1}>Galería de evidencias</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>Selecciona las fotos para la tarea</Text>
                </View>
                {selectedImages.length > 0 && (
                    <View style={styles.headerCount}>
                        <Ionicons name="images-outline" size={14} color={BRAND} />
                        <Text style={styles.headerCountText}>{selectedImages.length}</Text>
                    </View>
                )}
            </View> */}

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: footerBottom + 100 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ESTADO DE UBICACIÓN (solo lectura de estado existente) */}
                    <View style={styles.locationChip}>
                        <Ionicons
                            name={direccionActual ? 'location' : 'location-outline'}
                            size={16}
                            color={direccionActual ? BRAND : '#9CA3AF'}
                        />
                        <Text style={styles.locationChipText} numberOfLines={1}>
                            {direccionActual
                                ? 'Ubicación lista · se incluirá en la marca de agua'
                                : 'Obteniendo ubicación para la marca de agua…'}
                        </Text>
                        {!direccionActual && <ActivityIndicator size="small" color={BRAND} />}
                    </View>

                    {selectedImages.length === 0 ? (
                        /* ESTADO VACÍO */
                        <View style={styles.emptyStateContainer}>
                            <TouchableOpacity style={styles.uploadBtnEmpty} onPress={pickImages} activeOpacity={0.8}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="cloud-upload-outline" size={44} color={BRAND} />
                                </View>
                                <Text style={styles.uploadTitle}>Subir imágenes</Text>
                                <Text style={styles.uploadSubtitle}>Toca aquí para buscar en tu galería</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.sectionLabel}>Fotos seleccionadas</Text>

                            {/* CUADRÍCULA */}
                            <View style={styles.gridContainer}>
                                {selectedImages.map((uri, index) => (
                                    <View key={uri} style={[styles.imageWrapper, { width: itemSize, height: itemSize }]}>
                                        <Image source={{ uri }} style={styles.gridImage} />

                                        <View style={styles.indexBadge}>
                                            <Text style={styles.indexBadgeText}>{index + 1}</Text>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.removeBtn}
                                            onPress={() => removeImage(uri)}
                                            activeOpacity={0.8}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="close" size={14} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                {/* AÑADIR MÁS */}
                                <TouchableOpacity
                                    style={[styles.addMoreBtn, { width: itemSize, height: itemSize }]}
                                    onPress={pickImages}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.addMoreIcon}>
                                        <Ionicons name="add" size={24} color={BRAND} />
                                    </View>
                                    <Text style={styles.addMoreText}>Añadir más</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </ScrollView>

                {/* FOOTER FLOTANTE */}
                {selectedImages.length > 0 && (
                    <View style={[styles.footer, { bottom: footerBottom }]}>
                        <View style={styles.footerLeft}>
                            <View style={styles.badgeContainer}>
                                <Text style={styles.badgeNumber}>{selectedImages.length}</Text>
                            </View>
                            <View>
                                <Text style={styles.footerText}>
                                    {selectedImages.length === 1 ? 'foto lista' : 'fotos listas'}
                                </Text>
                                <Text style={styles.footerHint}>Se añadirá marca de agua</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryBtn, processing && { opacity: 0.7 }]}
                            onPress={handleSave}
                            disabled={processing}
                            activeOpacity={0.9}
                        >
                            {processing ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload" size={24} color="#FFF" />
                                    {/* <Text style={styles.primaryBtnText}></Text> */}
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* VISTA OCULTA PARA LA MARCA DE AGUA */}
                {processingUri && (
                    <View style={styles.hiddenContainer} pointerEvents="none">
                        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={{ width: 900, height: 1200 }}>
                            <Image
                                source={{ uri: processingUri }}
                                style={StyleSheet.absoluteFill}
                                resizeMode="cover"
                                onLoad={() => { imageLoadedRef.current = true; }}
                                onLoadEnd={() => { imageLoadedRef.current = true; }}
                            />
                            <View style={styles.watermarkWrapper}>
                                <WatermarkCard
                                    variant="watermark"
                                    direccion={direccionActual}
                                    cargandoDireccion={!direccionActual}
                                    latitud={currentLocation?.coords?.latitude}
                                    longitud={currentLocation?.coords?.longitude}
                                    altitud={currentLocation?.coords?.altitude}
                                    timestamp={new Date().toISOString()}
                                />
                            </View>
                        </ViewShot>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        paddingTop: StatusBar.currentHeight ? 0 : 0,
    },

    // HEADER
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SIDE_PADDING,
        paddingVertical: 14,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    headerTitleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 17,
        fontFamily: 'Poppins-Bold',
        color: '#111827',
        lineHeight: 24,
    },
    subtitle: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: '#6B7280',
        lineHeight: 16,
    },
    headerCount: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: BRAND_SOFT,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        marginLeft: 8,
    },
    headerCountText: {
        color: BRAND,
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },

    scrollContent: {
        paddingHorizontal: SIDE_PADDING,
        paddingTop: 16,
    },

    // CHIP DE UBICACIÓN
    locationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 20,
    },
    locationChipText: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#4B5563',
    },

    sectionLabel: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
        color: '#374151',
        marginBottom: 12,
    },

    // ESTADO VACÍO
    emptyStateContainer: {
        marginTop: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadBtnEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 24,
        backgroundColor: '#FFF',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FEE2E2',
        borderStyle: 'dashed',
        width: '100%',
    },
    iconCircle: {
        width: 88,
        height: 88,
        backgroundColor: BRAND_SOFT,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    uploadTitle: {
        color: '#111827',
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        marginBottom: 4,
    },
    uploadSubtitle: {
        color: '#6B7280',
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        textAlign: 'center',
    },

    // CUADRÍCULA
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GAP,
    },
    imageWrapper: {
        borderRadius: 14,
        backgroundColor: '#FFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    gridImage: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
        resizeMode: 'cover',
    },
    indexBadge: {
        position: 'absolute',
        left: 6,
        bottom: 6,
        minWidth: 22,
        height: 22,
        paddingHorizontal: 6,
        borderRadius: 11,
        backgroundColor: 'rgba(17,24,39,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    indexBadgeText: {
        color: '#FFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 11,
    },
    removeBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(17,24,39,0.7)',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addMoreBtn: {
        borderRadius: 14,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: BRAND_BORDER,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BRAND_SOFT,
    },
    addMoreIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    addMoreText: {
        color: BRAND,
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
    },

    // FOOTER FLOTANTE
    footer: {
        position: 'absolute',
        left: SIDE_PADDING,
        right: SIDE_PADDING,
        backgroundColor: '#FFF',
        paddingVertical: 10,
        paddingLeft: 14,
        paddingRight: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 16,
        borderColor: '#F3F4F6',
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    badgeContainer: {
        backgroundColor: BRAND_SOFT,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    badgeNumber: {
        color: BRAND,
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
    },
    footerText: {
        fontFamily: 'Poppins-SemiBold',
        color: '#111827',
        fontSize: 13,
        lineHeight: 18,
    },
    footerHint: {
        fontFamily: 'Poppins-Regular',
        color: '#9CA3AF',
        fontSize: 11,
        lineHeight: 14,
    },
    primaryBtn: {
        backgroundColor: BRAND,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
        // flexDirection: 'row',
        // alignItems: 'center',
        // justifyContent: 'center',
        minWidth: 10,
    },

    hiddenContainer: { position: 'absolute', left: -9999, top: -9999 },
    watermarkWrapper: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
});