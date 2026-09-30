// === Expo ===
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library/legacy';

// === Expo Router ===
import { router, Stack, useLocalSearchParams, usePathname } from 'expo-router';

// === React ===
import { useEffect, useRef, useState } from 'react';

// === React Native ===
import {
    Image,
    ImageBackground,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

// === Libs / Servicios ===
import { ActividadResumen, useActividad } from '../lib/actividades/ActividadContext';
import { DireccionInfo, obtenerDireccion } from '../lib/location/reverseGeocode';
import { useSync } from '../lib/sync/SyncContext';

// === Componentes ===
import WatermarkCard from '../components/WatermarkCard';
import ActividadSelectorModal from '../components/camera/ActividadSelectorModal';
import BottomControls from '../components/camera/BottomControls';
import CameraTopBar from '../components/camera/CameraTopBar';
import ConfirmCambioModal from '../components/camera/ConfirmCambioModal';
import TimerOverlay from '../components/camera/TimerOverlay';
import ZoomSelector, { ZoomLevel } from '../components/camera/ZoomSelector';


export default function CameraScreen() {

    const { estacion_servicio_actividad_id } = useLocalSearchParams<{
        estacion_servicio_actividad_id?: string;
    }>();

    const actividadId = estacion_servicio_actividad_id
        ? Number(estacion_servicio_actividad_id)
        : undefined;

    const [permission, requestPermission] = useCameraPermissions();
    const [mediaPermission, requestMediaPermission] =
        MediaLibrary.usePermissions({
            writeOnly: true,
            granularPermissions: ['photo'],
        });
    const [facing, setFacing] = useState<'back' | 'front'>('back');
    const [zoom, setZoom] = useState<ZoomLevel>(1);
    const [flash, setFlash] = useState<'off' | 'on'>('off');
    const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 5 | 10>(0);

    const params = useLocalSearchParams<{
        estacion_servicio_actividad_id?: string;
        estacionId?: string;
        estacionCodigo?: string;
        actividadNombre?: string;
        proyectoNombre?: string;
    }>();

    const {
        actividadActualId,
        actividadActual,
        actividades,
        actividadEnCurso,
        setActividadActual,
        cargarActividadEnCurso,
        agregarFotoActividad,
        descartarActividadEnCurso,
        transferirFotosAActividad,

    } = useActividad();

    const [selectorVisible, setSelectorVisible] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [pendingActividad, setPendingActividad] = useState<ActividadResumen | null>(null);

    // Derivados para el BottomControls
    const count = actividadEnCurso?.fotos.length ?? 0;
    const lastPhotoUri = actividadEnCurso?.fotos[actividadEnCurso.fotos.length - 1]?.uriLocal ?? null;



    const cameraRef = useRef<CameraView>(null);
    const { addPhotoToQueue } = useSync();
    const [cameraReady, setCameraReady] = useState(false);
    const [imageToProcessUri, setImageToProcessUri] = useState<string | null>(null);
    const [currentLocation, setCurrentLocation] = useState<any>(null);

    const isCapturingRef = useRef(false);
    const captureIdRef = useRef(0);
    const imageLoadedRef = useRef(false);

    const [heading, setHeading] = useState<number | null>(null);
    const [capturedAt, setCapturedAt] = useState<string | null>(null);

    const viewShotRef = useRef<any>(null);

    const pathname = usePathname();

    const [isImageLoaded, setIsImageLoaded] = useState(false);

    const [isCapturing, setIsCapturing] = useState(false);
    const [photoDimensions, setPhotoDimensions] = useState({ width: 1080, height: 1920 });

    const headingRef = useRef<number | null>(null);
    const headingSubRef = useRef<Location.LocationSubscription | null>(null);
    const lastKnownLocationRef = useRef<any>(null);
    const locationSubRef = useRef<Location.LocationSubscription | null>(null);

    const [direccionActual, setDireccionActual] = useState<DireccionInfo | null>(null);

    const [countdown, setCountdown] = useState<number | null>(null);





    useEffect(() => {
        if (pathname === '/camera') {
            setImageToProcessUri(null);
            setIsImageLoaded(false);
        }
    }, [pathname]);

    // ✅ REEMPLAZAR con esto
    useEffect(() => {
        const id = estacion_servicio_actividad_id
            ? Number(estacion_servicio_actividad_id)
            : null;
        if (id) {
            cargarActividadEnCurso(id);
        }
    }, []); // ← deps vacías: solo al montar

    useEffect(() => {
        if (pathname !== '/camera') return;

        const warmup = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            headingSubRef.current = await Location.watchHeadingAsync((data) => {
                const h = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
                if (h >= 0) headingRef.current = h;
            });

            locationSubRef.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
                (loc) => { lastKnownLocationRef.current = loc; }
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
    }, [pathname]);


    useEffect(() => {
        // Precargar la dirección de la ubicación actual
        const precargar = async () => {
            try {
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                const dir = await obtenerDireccion(
                    loc.coords.latitude,
                    loc.coords.longitude
                );

                if (dir) {
                    setDireccionActual(dir);
                    console.log('📍 Dirección precargada:', dir);
                }
            } catch (e) {
                console.warn('⚠️ No se pudo precargar dirección:', e);
            }
        };

        precargar();
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

    const takePicture = async () => {
        if (isCapturingRef.current) {
            return;
        }
        isCapturingRef.current = true;
        setIsCapturing(true);

        const myCaptureId = ++captureIdRef.current;

        try {
            if (!cameraRef.current || !cameraReady) {
                return;
            }

            if (timerSeconds > 0) {
                await runCountdown(timerSeconds);
            }

            try {

                const photo = await cameraRef.current.takePictureAsync();

                if (!photo?.uri) {
                    return;
                }

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

                } catch (manipulationError) {
                }

                let finalImageUri = imageToUse;
                try {
                    const location = lastKnownLocationRef.current;
                    const headingValue = headingRef.current;

                    // 🔑 Obtener dirección real (con caché)
                    if (location?.coords) {
                        try {
                            const dir = await obtenerDireccion(
                                location.coords.latitude,
                                location.coords.longitude
                            );
                            setDireccionActual(dir);
                            // Pequeño delay para que React re-renderice el ViewShot
                            await new Promise((r) => setTimeout(r, 150));
                        } catch (e) {
                            console.warn('⚠️ No se pudo obtener dirección:', e);
                            setDireccionActual(null);
                        }
                    }

                    setIsImageLoaded(false);
                    imageLoadedRef.current = false;
                    setImageToProcessUri(imageToUse);
                    setCurrentLocation(location);
                    setHeading(headingValue);

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

                    let uriWithWatermark = null;
                    if (viewShotRef.current && viewShotRef.current.capture) {
                        try {
                            uriWithWatermark = await viewShotRef.current.capture();

                            if (uriWithWatermark) {
                                try {
                                    const info = await FileSystem.getInfoAsync(uriWithWatermark as string);
                                    const sizeKB = ((info as any).size ?? 0) / 1024;

                                    if (sizeKB < 20) {
                                    }
                                } catch (e) {
                                }
                            }
                        } catch (err) {
                        }
                    }

                    if (uriWithWatermark) {
                        finalImageUri = uriWithWatermark as string;
                    }
                } catch (watermarkError) {
                }
                await agregarFotoActividad({
                    uriLocal: finalImageUri,
                    timestamp: new Date().toISOString(),
                    heading: headingRef.current,
                    latitud: lastKnownLocationRef.current?.coords?.latitude,
                    longitud: lastKnownLocationRef.current?.coords?.longitude,
                    altitud: lastKnownLocationRef.current?.coords?.altitude,
                    precision: lastKnownLocationRef.current?.coords?.accuracy,
                });
                setImageToProcessUri(null);
            } catch (error) {
            }
        } catch (error) {
        } finally {
            isCapturingRef.current = false;
            setIsCapturing(false);
            setCountdown(null);
        }
    };
    const now = new Date();

    const fecha = capturedAt ? new Date(capturedAt) : new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fechaStr = `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear().toString().slice(-2)}`;
    const hora12 = fecha.getHours() % 12 === 0 ? 12 : fecha.getHours() % 12;
    const horaStr = `${hora12}:${pad(fecha.getMinutes())} ${fecha.getHours() >= 12 ? 'pm' : 'am'}`;

    const puntosCardinales = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

    const gradoACardinal = (deg: number): string =>
        puntosCardinales[Math.round(deg / 45) % 8];

    const zoomScale = zoom === 1 ? 0 : zoom === 2 ? 0.5 : 0;
    const handlePreviewPhoto = () => {
        if (!lastPhotoUri) return;
        router.push('/photo-album' as any);
    };

    const handleOpenAlbum = () => {
        router.push('/photo-album' as any);
    };

    const handleActividadSelect = async (nuevaActividad: ActividadResumen) => {
        setSelectorVisible(false);
        if (nuevaActividad.id === actividadActualId) return;

        if (count > 0) {
            setPendingActividad(nuevaActividad);
            setConfirmVisible(true);
        } else {
            await setActividadActual(nuevaActividad.id);
        }
    };

    const handleReasignar = async () => {
        if (!pendingActividad) return;

        await transferirFotosAActividad(pendingActividad.id);

        setConfirmVisible(false);
        setPendingActividad(null);
    };

    const handleExportarYCambiar = () => {
        if (!pendingActividad) return;

        const nextId = pendingActividad.id;
        setConfirmVisible(false);
        setPendingActividad(null);

        // Ir al álbum con el "next" para volver a la nueva actividad
        router.push({
            pathname: '/photo-album' as any,
            params: { nextActividadId: String(nextId) },
        });
    };


    const handleCancelarCambio = () => {
        setConfirmVisible(false);
        setPendingActividad(null);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={true} />

            <CameraTopBar
                onBack={() => {
                    if (router.canGoBack()) {
                        router.back();
                    } else {
                        router.replace('/(tabs)' as any);
                    }
                }}
                savedCount={count}
                saving={false}
                onSave={handleOpenAlbum}
                onLongPressSave={handleOpenAlbum}
                timer={timerSeconds > 0}
                onToggleTimer={() =>
                    setTimerSeconds((prev) => (prev === 0 ? 3 : 0))
                }
                flash={flash}
                onToggleFlash={toggleFlash}
                actividadNombre={actividadActual?.nombre ?? 'Sin actividad'}
                onPressActividad={() => setSelectorVisible(true)}
            />

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

            <ZoomSelector zoom={zoom} onChange={setZoom} />

            <BottomControls
                cameraReady={cameraReady}
                isCapturing={isCapturing}
                onTakePicture={takePicture}
                onFlipCamera={toggleCameraFacing}
                photoCount={count}
                lastPhotoUri={lastPhotoUri}
                onPreviewPhoto={handleOpenAlbum}
                onDiscardPhotos={handleOpenAlbum}
                onOpenGallery={handleOpenAlbum}
            />

            <TimerOverlay countdown={countdown} />

            {/* Watermark oculto para ViewShot */}
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
                                setIsImageLoaded(true);
                            }}
                        />
                    ) : null}

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

                    <View style={styles.infoCardWrapper}>
                        <WatermarkCard
                            variant="watermark"
                            direccion={direccionActual}
                            cargandoDireccion={!direccionActual}
                            latitud={lastKnownLocationRef.current?.coords?.latitude}
                            longitud={lastKnownLocationRef.current?.coords?.longitude}
                            heading={heading}
                            timestamp={capturedAt ?? new Date().toISOString()}
                        />
                    </View>
                </ViewShot>
            </View>

            {/* Modales */}
            <ActividadSelectorModal
                visible={selectorVisible}
                actividades={actividades}
                actualId={actividadActualId}
                onSelect={handleActividadSelect}
                onClose={() => setSelectorVisible(false)}
            />

            <ConfirmCambioModal
                visible={confirmVisible && !!pendingActividad && !!actividadActual}
                cantidadFotos={count}
                actividadActualNombre={actividadActual?.nombre ?? ''}
                actividadNuevaNombre={pendingActividad?.nombre ?? ''}
                onReasignar={handleReasignar}
                onExportarYCambiar={handleExportarYCambiar}
                onCancelar={handleCancelarCambio}
            />
        </SafeAreaView>
    );
};
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    darkBackground: { flex: 1, backgroundColor: '#000000' },
    centerContent: { justifyContent: 'center', alignItems: 'center', padding: 20 },
    permissionText: { color: '#FFFFFF', fontSize: 16, marginBottom: 20 },
    permissionButton: { backgroundColor: '#7A1C1C', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
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
    floatingCircleWrapper: { position: 'absolute', bottom: 16, right: 16 },
    floatingCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.65)' },
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
});