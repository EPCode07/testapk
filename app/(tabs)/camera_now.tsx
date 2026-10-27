/* eslint-disable @typescript-eslint/no-unused-vars */
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';

import { router, Stack, useFocusEffect } from 'expo-router';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
    Image,
    ImageBackground,
    Modal,
    Platform,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { DireccionInfo, obtenerDireccion } from '@/lib/location/reverseGeocode';
import { useSync } from '@/lib/sync/SyncContext';

import WatermarkCard from '@/components/WatermarkCard';
import BottomControls from '@/components/camera/BottomControls';
import CameraTopBar from '@/components/camera/CameraTopBar';
import TimerOverlay from '@/components/camera/TimerOverlay';
import ZoomSelector, { ZoomLevel } from '@/components/camera/ZoomSelector';

type FotoVisor = {
    uriLocal: string;
    actividadNombre?: string;
    descripcionIndividual?: string;
    timestamp?: string;
    creadoEn?: string;
    latitud?: number | null;
    longitud?: number | null;
};

export default function CameraScreen() {
    const insets = useSafeAreaInsets();

    const [permission, requestPermission] = useCameraPermissions();
    MediaLibrary.usePermissions({
        writeOnly: true,
        granularPermissions: ['photo'],
    });

    const [facing, setFacing] = useState<'back' | 'front'>('back');
    const [zoom, setZoom] = useState<ZoomLevel>(1);
    const [flash, setFlash] = useState<'off' | 'on'>('off');
    const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 5 | 10>(0);

    const [fotoSeleccionada, setFotoSeleccionada] = useState<FotoVisor | null>(null);

    const cameraRef = useRef<CameraView>(null);
    useSync();
    const [cameraReady, setCameraReady] = useState(false);
    const [imageToProcessUri, setImageToProcessUri] = useState<string | null>(null);
    const [currentLocation, setCurrentLocation] = useState<any>(null);

    const isCapturingRef = useRef(false);
    const captureIdRef = useRef(0);
    const imageLoadedRef = useRef(false);

    const [heading, setHeading] = useState<number | null>(null);
    const [capturedAt, setCapturedAt] = useState<string | null>(null);

    const viewShotRef = useRef<any>(null);

    const [isCapturing, setIsCapturing] = useState(false);
    const [photoDimensions, setPhotoDimensions] = useState({ width: 1080, height: 1920 });

    const headingRef = useRef<number | null>(null);
    const headingSubRef = useRef<Location.LocationSubscription | null>(null);
    const lastKnownLocationRef = useRef<any>(null);
    const locationSubRef = useRef<Location.LocationSubscription | null>(null);
    const [altitud, setAltitud] = useState<number | null>(null);
    const [altitudeAccuracy, setAltitudeAccuracy] = useState<number | null>(null);

    const [direccionActual, setDireccionActual] = useState<DireccionInfo | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);

    useFocusEffect(
        useCallback(() => {
            setImageToProcessUri(null);
            if (Platform.OS === 'android') {
                StatusBar.setHidden(true, 'fade');
            }
            return () => {
                if (Platform.OS === 'android') {
                    StatusBar.setHidden(false, 'fade');
                }
            };
        }, [])
    );

    useEffect(() => {
        const warmup = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            headingSubRef.current = await Location.watchHeadingAsync((data) => {
                const h = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
                if (h >= 0) headingRef.current = h;
            });
            locationSubRef.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, distanceInterval: 5 },
                (loc) => {
                    lastKnownLocationRef.current = loc;
                }
            );
        };

        warmup();

        return () => {
            headingSubRef.current?.remove();
            headingSubRef.current = null;
            locationSubRef.current?.remove();
            locationSubRef.current = null;
            headingRef.current = null;
            lastKnownLocationRef.current = null;
        };
    }, []);

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

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const runCountdown = async (seconds: number) => {
        for (let i = seconds; i > 0; i--) {
            setCountdown(i);
            await sleep(1000);
        }
        setCountdown(null);
    };

    const handleCompartir = async (foto: FotoVisor) => {
        try {
            if (Platform.OS === 'ios') {
                await Share.share({
                    title: `Foto de ${foto.actividadNombre ?? 'actividad'}`,
                    message: `Foto de actividad: ${foto.actividadNombre ?? ''}\nFecha: ${new Date(
                        foto.timestamp ?? Date.now()
                    ).toLocaleString('es-PE')}`,
                    url: foto.uriLocal,
                });
                return;
            }

            if (!(await Sharing.isAvailableAsync())) return;

            let uriParaCompartir = foto.uriLocal;

            if (!uriParaCompartir.startsWith('file://')) {
                const destino = `${FileSystem.cacheDirectory}foto-${Date.now()}.jpg`;
                const { uri } = await FileSystem.downloadAsync(
                    uriParaCompartir,
                    destino
                );
                uriParaCompartir = uri;
            }

            await Sharing.shareAsync(uriParaCompartir, {
                dialogTitle: `Foto de ${foto.actividadNombre ?? 'actividad'}`,
                mimeType: 'image/jpeg',
            });
        } catch (e) {
            console.warn('Error compartiendo:', e);
        }
    };

    const takePicture = async () => {
        if (isCapturingRef.current) return;
        isCapturingRef.current = true;
        setIsCapturing(true);

        const myCaptureId = ++captureIdRef.current;

        try {
            if (!cameraRef.current || !cameraReady) return;

            if (timerSeconds > 0) {
                await runCountdown(timerSeconds);
            }

            try {
                const photo = await cameraRef.current.takePictureAsync();

                if (!photo?.uri) return;

                setCapturedAt(new Date().toISOString());

                if (photo.width && photo.height) {
                    setPhotoDimensions({ width: photo.width, height: photo.height });
                }
                let imageToUse = photo.uri;

                try {
                    const TARGET_WIDTH = 900;
                    const TARGET_HEIGHT = 1125;

                    const manipulatedImage = await ImageManipulator.manipulateAsync(
                        photo.uri,
                        [{ resize: { width: TARGET_WIDTH, height: TARGET_HEIGHT } }],
                        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                    );

                    imageToUse = manipulatedImage.uri;
                    setPhotoDimensions({ width: TARGET_WIDTH, height: TARGET_HEIGHT });
                } catch (manipulationError) { }

                let finalImageUri = imageToUse;
                try {
                    let location = lastKnownLocationRef.current;

                    if (!location?.coords || (location.coords.accuracy ?? 999) > 30) {
                        try {
                            location = await Location.getCurrentPositionAsync({
                                accuracy: Location.Accuracy.High,
                            });
                            lastKnownLocationRef.current = location;
                        } catch (e) {
                            console.warn('⚠️ No se pudo obtener ubicación fresca:', e);
                        }
                    }

                    const headingValue = headingRef.current;

                    if (location?.coords) {
                        try {
                            const dir = await obtenerDireccion(
                                location.coords.latitude,
                                location.coords.longitude
                            );
                            setDireccionActual(dir);
                            await new Promise((r) => setTimeout(r, 150));
                        } catch (e) {
                            console.warn('⚠️ No se pudo obtener dirección:', e);
                            setDireccionActual(null);
                        }
                    }


                    imageLoadedRef.current = false;
                    setImageToProcessUri(imageToUse);
                    setCurrentLocation(location);
                    setHeading(headingValue);
                    const altValida =
                        location?.coords?.altitude != null &&
                        location.coords.altitude !== 0 &&
                        (location.coords.altitudeAccuracy ?? 0) > 0;
                    setAltitud(altValida ? location.coords.altitude : null);
                    setAltitudeAccuracy(location?.coords?.altitudeAccuracy ?? null);



                    await new Promise<void>((resolve) => {
                        let elapsed = 0;
                        const check = () => {
                            elapsed += 50;
                            if (imageLoadedRef.current && captureIdRef.current === myCaptureId) {
                                setTimeout(resolve, 250);
                            } else if (elapsed >= 2500) {
                                resolve();
                            } else {
                                setTimeout(check, 50);
                            }
                        };
                        check();
                    });

                    let uriWithWatermark: string | null = null;
                    if (viewShotRef.current && viewShotRef.current.capture) {
                        try {
                            uriWithWatermark = await viewShotRef.current.capture();

                            if (uriWithWatermark) {
                                await FileSystem.getInfoAsync(uriWithWatermark);
                            }
                        } catch (err) { }
                    }

                    if (uriWithWatermark) {
                        finalImageUri = uriWithWatermark;
                    }
                } catch (watermarkError) { }

                const timestampNow = new Date().toISOString();

                try {
                    const { status } = await MediaLibrary.requestPermissionsAsync();
                    if (status === 'granted') {
                        await MediaLibrary.saveToLibraryAsync(finalImageUri);
                    } else {
                    }
                } catch (e) {
                }

                setFotoSeleccionada({
                    uriLocal: finalImageUri,
                    actividadNombre: 'Foto',
                    timestamp: timestampNow,
                    latitud: lastKnownLocationRef.current?.coords?.latitude ?? null,
                    longitud: lastKnownLocationRef.current?.coords?.longitude ?? null,
                });

                setImageToProcessUri(null);
            } catch (error) { }
        } catch (error) {
        } finally {
            isCapturingRef.current = false;
            setIsCapturing(false);
            setCountdown(null);
        }
    };

    const zoomScale = zoom === 1 ? 0 : zoom === 2 ? 0.5 : 0;

    const handleOpenAlbum = () => {
        router.push('/photo-album' as any);
    };


    return (
        <View style={{ flex: 1, backgroundColor: '#000000', paddingTop: 50 }}>
            <Stack.Screen options={{ headerShown: false }} />


            <CameraTopBar
                showTitle={false}
                onBack={() => {
                    if (router.canGoBack()) {
                        router.back();
                    } else {
                        router.replace('/(tabs)' as any);
                    }
                }}
                timer={timerSeconds > 0}
                onToggleTimer={() => setTimerSeconds((prev) => (prev === 0 ? 3 : 0))}
                flash={flash}
                onToggleFlash={toggleFlash}
            />

            <View style={styles.cameraContainer}>
                <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing={facing}
                    enableTorch={flash === 'on'}
                    zoom={zoomScale}
                    onCameraReady={() => {
                        setCameraReady(true);
                    }}
                />
            </View>

            <ZoomSelector zoom={zoom} onChange={setZoom} />

            <BottomControls
                cameraReady={cameraReady}
                isCapturing={isCapturing}
                onTakePicture={takePicture}
                onFlipCamera={toggleCameraFacing}
                photoCount={0}
                lastPhotoUri={null}
                onPreviewPhoto={() => { }}
                onDiscardPhotos={() => { }}
                onOpenGallery={handleOpenAlbum}
                hidePhotoStack
            />

            <TimerOverlay countdown={countdown} />

            <View style={styles.hiddenWatermarkContainer} pointerEvents="none">
                <ViewShot
                    key={imageToProcessUri ? imageToProcessUri : 'empty-camera-state'}
                    ref={viewShotRef}
                    options={{ format: 'jpg', quality: 0.9 }}
                    style={[
                        styles.watermarkContainer,
                        {
                            width: 900,
                            height:
                                Math.round(
                                    900 * (photoDimensions.height / photoDimensions.width)
                                ) || 1125,
                        },
                    ]}
                >
                    {imageToProcessUri ? (
                        <Image
                            source={{ uri: imageToProcessUri }}
                            style={styles.capturedImageBackground}
                            resizeMode="cover"
                            onLoad={() => {
                                imageLoadedRef.current = true;
                            }}
                        />
                    ) : null}

                    <ImageBackground
                        source={require('@/assets/images/rectangulo.png')}
                        style={styles.logoTag}
                        imageStyle={styles.logoTagImage}
                        resizeMode="stretch"
                    >
                        <Image
                            source={require('@/assets/images/logo-yhoma.png')}
                            style={styles.headerLogo}
                            resizeMode="contain"
                        />
                    </ImageBackground>

                    <View style={styles.infoCardWrapper}>
                        <WatermarkCard
                            variant="watermark"
                            direccion={direccionActual}
                            cargandoDireccion={!direccionActual}
                            latitud={currentLocation?.coords?.latitude}
                            longitud={currentLocation?.coords?.longitude}
                            altitud={altitud}
                            altitudeAccuracy={altitudeAccuracy}
                            heading={heading}
                            timestamp={capturedAt ?? new Date().toISOString()}
                        />
                    </View>
                </ViewShot>
            </View>

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
                                    {new Date(fotoSeleccionada.timestamp!).toLocaleString('es-PE')}
                                </Text>
                            </View>
                            {fotoSeleccionada.latitud != null &&
                                fotoSeleccionada.longitud != null && (
                                    <View style={styles.viewerMetaRow}>
                                        <Ionicons
                                            name="location-outline"
                                            size={16}
                                            color="#9CA3AF"
                                        />
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
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    darkBackground: { flex: 1, backgroundColor: '#000000' },
    centerContent: { justifyContent: 'center', alignItems: 'center', padding: 20 },
    permissionText: { color: '#FFFFFF', fontSize: 16, marginBottom: 20 },
    permissionButton: {
        backgroundColor: '#7A1C1C',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    permissionButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
    cameraContainer: {
        flex: 1,
        marginHorizontal: 12,
        marginTop: 4,
        borderRadius: 20,
        backgroundColor: '#111111',
        position: 'relative',
        overflow: 'hidden',
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
    logoTag: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 280,
        height: 72,
        paddingHorizontal: 18,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    logoTagImage: {},
    headerLogo: {
        width: 180,
        height: 90,
    },
    infoCardWrapper: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 60,
    },

    // ===== VISOR DE FOTO =====
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