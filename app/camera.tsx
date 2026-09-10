import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ImageBackground, StatusBar, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, usePathname } from 'expo-router';
import { useSync } from '../lib/sync/SyncContext';
import * as ImageManipulator from 'expo-image-manipulator';


import ViewShot from 'react-native-view-shot';
import * as Location from 'expo-location';

type ZoomLevel = 0.5 | 1 | 2;

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [mediaPermission, requestMediaPermission] =
        MediaLibrary.usePermissions({
            writeOnly: true,
            granularPermissions: ['photo'],
        });
    const [facing, setFacing] = useState<'back' | 'front'>('back');
    const [zoom, setZoom] = useState<ZoomLevel>(1);
    const [flash, setFlash] = useState<'off' | 'on'>('off');
    const [timer, setTimer] = useState<boolean>(false);
    const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
    const cameraRef = useRef<CameraView>(null);
    const { addPhotoToQueue } = useSync();
    const [cameraReady, setCameraReady] = useState(false);
    const [imageToProcessUri, setImageToProcessUri] = useState<string | null>(null);
    const [currentLocation, setCurrentLocation] = useState<any>(null);
    const [heading, setHeading] = useState<number | null>(null);
    const [capturedAt, setCapturedAt] = useState<string | null>(null);

    const viewShotRef = useRef<any>(null);

    const pathname = usePathname();

    const [isImageLoaded, setIsImageLoaded] = useState(false);

    const [photoDimensions, setPhotoDimensions] = useState({ width: 1080, height: 1920 });

    const headingRef = useRef<number | null>(null);
    const headingSubRef = useRef<Location.LocationSubscription | null>(null);
    const lastKnownLocationRef = useRef<any>(null);
    const locationSubRef = useRef<Location.LocationSubscription | null>(null);

    useEffect(() => {
        if (pathname === '/camera') {
            setImageToProcessUri(null);
            setIsImageLoaded(false);
        }
    }, [pathname]);



    // Precalentar ambos sensores mientras la cámara está abierta
    useEffect(() => {
        if (pathname !== '/camera') return;

        const warmup = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            // 🧭 Brújula (heading)
            headingSubRef.current = await Location.watchHeadingAsync((data) => {
                const h = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
                if (h >= 0) headingRef.current = h;
            });

            // 📍 GPS (mantener fix fresco)
            locationSubRef.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
                (loc) => { lastKnownLocationRef.current = loc; }
            );
        };

        warmup();

        // 👇 Limpieza al salir de la pantalla
        return () => {
            headingSubRef.current?.remove();
            headingSubRef.current = null;
            locationSubRef.current?.remove();
            locationSubRef.current = null;
            headingRef.current = null;
            lastKnownLocationRef.current = null;
        };
    }, [pathname]);


    if (!permission) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.darkBackground} />
            </>
        );
    }

    if (!permission.granted) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <SafeAreaView style={[styles.darkBackground, styles.centerContent]}>
                    <Text style={styles.permissionText}>Requerimos acceso a la cámara</Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>Conceder Permiso</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </>
        );
    }

    const toggleCameraFacing = () => {
        setFacing((current) => (current === 'back' ? 'front' : 'back'));
    };

    const toggleFlash = () => {
        setFlash((current) => (current === 'off' ? 'on' : 'off'));
    };

    const takePicture = async () => {
        try {
            if (!cameraRef.current || !cameraReady) {
                console.log('❌ Cámara todavía no está lista');
                return;
            }

            try {
                console.log('📸 Tomando foto...');

                const photo = await cameraRef.current.takePictureAsync();

                if (!photo?.uri) {
                    console.log('❌ No se obtuvo URI de la foto');
                    return;
                }

                setCapturedAt(new Date().toISOString());

                if (photo.width && photo.height) {
                    setPhotoDimensions({ width: photo.width, height: photo.height });
                }
                console.log('✅ Foto capturada (original):', photo.uri);

                let imageToUse = photo.uri;

                try {
                    console.log('🔄 Normalizando dimensiones a relación 4:5...');

                    const TARGET_WIDTH = 1200;
                    const TARGET_HEIGHT = 1500; // Relación exacta 4:5 (1200x1500)

                    const manipulatedImage = await ImageManipulator.manipulateAsync(
                        photo.uri,
                        [
                            { resize: { width: TARGET_WIDTH, height: TARGET_HEIGHT } }
                        ],
                        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                    );

                    imageToUse = manipulatedImage.uri;
                    setPhotoDimensions({ width: TARGET_WIDTH, height: TARGET_HEIGHT });

                    console.log('✅ Imagen fijada en relación 4:5:', TARGET_WIDTH, 'x', TARGET_HEIGHT);
                } catch (manipulationError) {
                    console.error('⚠️ Error normalizando imagen:', manipulationError);
                }

                let finalImageUri = imageToUse;
                try {
                    // 👇 TODO ESTO ahora es instantáneo, los sensores ya estaban calientes
                    console.log('📍 Obteniendo ubicación...');
                    const location = lastKnownLocationRef.current;
                    const headingValue = headingRef.current;
                    console.log('✅ Ubicación (precalentada):', location?.coords ?? 'sin fix aún');
                    console.log('🧭 Heading (precalentado):', headingValue);

                    setIsImageLoaded(false);
                    setImageToProcessUri(imageToUse);
                    setCurrentLocation(location);
                    setHeading(headingValue);

                    await new Promise<void>((resolve) => {
                        let elapsedTime = 0;
                        const interval = setInterval(() => {
                            elapsedTime += 40;
                            if (isImageLoaded || elapsedTime >= 800) {
                                clearInterval(interval);
                                resolve();
                            }
                        }, 40);
                    });

                    let uriWithWatermark = null;
                    if (viewShotRef.current && viewShotRef.current.capture) {
                        try {
                            uriWithWatermark = await viewShotRef.current.capture();
                        } catch (err) {
                            console.error('Error en captura de ViewShot:', err);
                        }
                    }

                    if (uriWithWatermark) {
                        finalImageUri = uriWithWatermark as string;
                        console.log('✅ Marca de agua aplicada con éxito:', finalImageUri);
                    }
                } catch (watermarkError) {
                    console.error('⚠️ Error aplicando marca de agua, usando imagen limpia:', watermarkError);
                }

                setLastPhotoUri(finalImageUri);
                setImageToProcessUri(null);

                setTimeout(() => {
                    router.push({
                        pathname: '/photo-preview' as any,
                        params: { watermarkedUri: finalImageUri },
                    });
                }, 150);
            } catch (error) {
                console.error('❌ ERROR TOMANDO FOTO:', error);
            }
        } catch (error) {
            console.error('🔥 CRASH EVITADO EN CAMARA:', error);
        }
    };

    const now = new Date();

    const fecha = capturedAt ? new Date(capturedAt) : new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fechaStr = `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear().toString().slice(-2)}`;
    const hora12 = fecha.getHours() % 12 === 0 ? 12 : fecha.getHours() % 12;
    const horaStr = `${hora12}:${pad(fecha.getMinutes())} ${fecha.getHours() >= 12 ? 'pm' : 'am'}`;

    // Fuera del componente o antes del return
    const puntosCardinales = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

    const gradoACardinal = (deg: number): string =>
        puntosCardinales[Math.round(deg / 45) % 8];

    const zoomScale = zoom === 1 ? 0 : zoom === 2 ? 0.5 : 0;

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={true} />

            <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.topRightIcons}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => setTimer(!timer)}>
                        <Ionicons name="timer-outline" size={22} color={timer ? '#4DA6FF' : '#FFFFFF'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={toggleFlash}>
                        <Ionicons name="flash" size={22} color={flash === 'on' ? '#FFD700' : '#FFFFFF'} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.cameraContainer}>
                <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing={facing}
                    enableTorch={flash === 'on'}
                    zoom={zoomScale}
                    onCameraReady={() => {
                        console.log('📷 Cámara lista');
                        setCameraReady(true);
                    }}
                />
                <View style={styles.floatingCircleWrapper}>
                    <TouchableOpacity style={styles.floatingCircle} />
                </View>
            </View>

            <View style={styles.zoomContainer}>
                <TouchableOpacity onPress={() => setZoom(0.5)} style={styles.zoomOption}>
                    <Text style={[styles.zoomText, zoom === 0.5 && styles.activeZoomText]}>0.5X</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setZoom(1)} style={styles.zoomOption}>
                    <Text style={[styles.zoomText, zoom === 1 && styles.activeZoomText]}>1X</Text>
                    {zoom === 1 && <View style={styles.zoomIndicatorBar} />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setZoom(2)} style={styles.zoomOption}>
                    <Text style={[styles.zoomText, zoom === 2 && styles.activeZoomText]}>2X</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
                <TouchableOpacity style={styles.sideButton} onPress={toggleCameraFacing}>
                    <Ionicons name="sync-outline" size={28} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.shutterButtonOuter, !cameraReady && { opacity: 0.5 }]}
                    onPress={takePicture}
                    disabled={!cameraReady}
                >
                    <View style={styles.shutterButtonInner} />
                </TouchableOpacity>

                {/* Miniatura de galería: badge único (antes estaba duplicado) */}
                <TouchableOpacity
                    style={styles.thumbnailWrapper}
                    onPress={() => {
                        if (lastPhotoUri) {
                            router.push({
                                pathname: '/photo-preview' as any,
                                params: { watermarkedUri: lastPhotoUri },
                            });
                        }
                    }}
                >
                    <View style={styles.thumbnailContainer}>
                        {lastPhotoUri ? (
                            <Image source={{ uri: lastPhotoUri }} style={styles.thumbnailImage} />
                        ) : (
                            <View style={[styles.thumbnailImage, { backgroundColor: '#222' }]} />
                        )}
                    </View>
                    <View style={styles.thumbnailBadge}>
                        <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>
            </View>

            {/* ================================================================= */}
            {/* 🚀 COMPONENTE DE MARCA DE AGUA (OCULTO PERO ACTIVO PARA CAPTURA)     */}
            {/* ================================================================= */}

            <View style={styles.hiddenWatermarkContainer} pointerEvents="none">
                <ViewShot
                    key={imageToProcessUri ? imageToProcessUri : 'empty-camera-state'}
                    ref={viewShotRef}
                    options={{ format: 'jpg', quality: 0.9 }}
                    style={[
                        styles.watermarkContainer,
                        {
                            width: 1080,
                            height: Math.round(1080 * (photoDimensions.height / photoDimensions.width)) || 1920,
                        },
                    ]}
                >
                    {/* Fondo: la foto limpia cubriendo todo el espacio */}
                    {imageToProcessUri ? (
                        <Image
                            source={{ uri: imageToProcessUri }}
                            style={styles.capturedImageBackground}
                            resizeMode="cover"
                            onLoad={() => {
                                console.log('🖼️ Imagen cargada en ViewShot correctamente');
                                setIsImageLoaded(true);
                            }}
                        />
                    ) : null}

                    {/* Etiqueta del logo: ahora el fondo es TU imagen (rectangulo.png), no un rectángulo dibujado por código */}
                    <ImageBackground
                        source={require('../assets/images/rectangulo.png')}
                        style={styles.logoTag}
                        imageStyle={styles.logoTagImage}
                        resizeMode="stretch"
                    >
                        <Image
                            source={require('../assets/images/logo-yhoma.png')}
                            style={styles.headerLogo}
                            resizeMode="contain"
                        />
                    </ImageBackground>

                    {/* Tarjeta inferior de datos */}
                    <View style={styles.infoCardWrapper}>
                        <View style={styles.infoCard}>
                            {/* SECCIÓN 1: Miniatura de mapa y dirección */}
                            <View style={styles.sectionMap}>
                                <Image source={require('../assets/images/mapa.png')} style={styles.mapImage} />
                                <View style={styles.addressContainer}>
                                    <Text style={styles.textMain} numberOfLines={2}>
                                        (Nombre de dirección)
                                    </Text>
                                    <Text style={styles.textSub}>(Distrito)</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* SECCIÓN 2: Coordenadas Lat / Long */}
                            <View style={styles.sectionCoords}>
                                <View style={styles.coordGroup}>
                                    <Text style={styles.label}>Lat:</Text>
                                    <Text style={styles.value}>12.0791117S</Text>
                                </View>
                                <View style={styles.coordGroup}>
                                    <Text style={styles.label}>Long:</Text>
                                    <Text style={styles.value}>77.083989W</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* SECCIÓN 3: Brújula, fecha y hora */}
                            <View style={styles.sectionMeta}>
                                <View style={styles.metaRow}>
                                    <Ionicons name="compass-outline" size={20} color="#FFFFFF" />
                                    <Text style={styles.metaText}>
                                        {' '}
                                        {heading != null ? gradoACardinal(heading) : '--'}
                                        <Text style={styles.metaBold}>
                                            {heading != null ? `${Math.round(heading)}°` : '--°'}
                                        </Text>
                                    </Text>
                                </View>
                                <View style={styles.metaRow}>
                                    <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
                                    <Text style={styles.metaText}> {fechaStr}</Text>
                                </View>
                                <View style={styles.metaRow}>
                                    <Ionicons name="time-outline" size={20} color="#FFFFFF" />
                                    <Text style={styles.metaText}> {horaStr}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ViewShot>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    darkBackground: { flex: 1, backgroundColor: '#000000' },
    centerContent: { justifyContent: 'center', alignItems: 'center', padding: 20 },
    permissionText: { color: '#FFFFFF', fontSize: 16, marginBottom: 20 },
    permissionButton: { backgroundColor: '#7A1C1C', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    permissionButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#000000',
    },
    topRightIcons: { flexDirection: 'row', gap: 20 },
    iconButton: { padding: 4 },
    cameraContainer: {
        flex: 1,
        marginHorizontal: 12,
        marginTop: 4,
        borderRadius: 20,
        backgroundColor: '#111111',
        position: 'relative',
        overflow: 'hidden',
    },
    floatingCircleWrapper: { position: 'absolute', bottom: 16, right: 16 },
    floatingCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.65)' },
    zoomContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: '#000000',
        gap: 40,
    },
    zoomOption: { alignItems: 'center' },
    zoomText: { color: '#888888', fontSize: 14, fontWeight: '600' },
    activeZoomText: { color: '#FFFFFF', fontWeight: 'bold' },
    zoomIndicatorBar: { height: 2, width: 24, backgroundColor: '#FFFFFF', marginTop: 4, borderRadius: 1 },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#000000',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    sideButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
    shutterButtonOuter: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shutterButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#000000' },
    thumbnailWrapper: { position: 'relative', width: 50, height: 50 },
    thumbnailContainer: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#FF3040', overflow: 'hidden' },
    thumbnailImage: { width: '100%', height: '100%' },
    thumbnailBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#FF3040',
        borderRadius: 10,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#000000',
    },

    hiddenWatermarkContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0,
        zIndex: -1,
    },
    watermarkContainer: {
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    capturedImageBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },

    // --- Etiqueta del logo: ahora el fondo viene de rectangulo.png (no un View dibujado) ---
    logoTag: {
        position: 'absolute',
        top: 0,
        left: 0,
        // Proporción 128:33 de tu rectangulo.png — si cambias el width, recalcula el height igual:
        // height = width * (33 / 128)
        width: 280,
        height: 72, // 220 * (33/128) ≈ 56.7
        paddingHorizontal: 18,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    logoTagImage: {
        // Si tu PNG tiene esquinas/curvas ya dibujadas, "stretch" es lo más fiel.
        // Si prefieres que NO se deforme aunque sobre espacio transparente, usa resizeMode="contain" arriba.
    },
    headerLogo: {
        width: 180,
        height: 90,
    },

    // --- Tarjeta inferior de datos ---
    // El wrapper se encarga de POSICIONAR y CENTRAR (nunca mezclar esto con el ancho de la tarjeta)
    infoCardWrapper: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center', // esto es lo que realmente centra la tarjeta
    },
    // La tarjeta solo se encarga de su apariencia y ancho, SIN position/left/right
    infoCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(10, 10, 10, 0.85)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
        padding: 20,
        alignItems: 'center',
        width: '80%',
    },
    sectionMap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1.4,
    },
    mapImage: {
        width: 72,
        height: 72,
        borderRadius: 10,
        backgroundColor: '#ccc',
    },
    addressContainer: {
        marginLeft: 10,
        flex: 1,
    },
    textMain: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    textSub: {
        color: '#CCCCCC',
        fontSize: 15,
        marginTop: 3,
    },
    sectionCoords: {
        flex: 1,
        paddingHorizontal: 10,
        justifyContent: 'center',
    },
    coordGroup: {
        marginVertical: 3,
    },
    label: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    value: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    sectionMeta: {
        flex: 0.95,
        justifyContent: 'space-around',
        paddingLeft: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 3,
    },
    metaText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    metaBold: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    divider: {
        width: 1,
        height: '85%',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        marginHorizontal: 4,
    },
});