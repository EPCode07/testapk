import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, StatusBar } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useSync } from '../lib/sync/SyncContext';

type ZoomLevel = 0.5 | 1 | 2;

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
    const [facing, setFacing] = useState<'back' | 'front'>('back');
    const [zoom, setZoom] = useState<ZoomLevel>(1);
    const [flash, setFlash] = useState<'off' | 'on'>('off');
    const [timer, setTimer] = useState<boolean>(false);
    const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
    const cameraRef = useRef<CameraView>(null);
    const { addPhotoToQueue } = useSync();

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
        if (!cameraRef.current) return;
        try {
            // Permiso de galería (puede pedirse aquí, justo cuando se necesita)
            if (!mediaPermission?.granted) {
                const perm = await requestMediaPermission();
                if (!perm.granted) {
                    console.warn('Permiso de galería no concedido, no se puede guardar la foto.');
                    return;
                }
            }

            const photo = await cameraRef.current.takePictureAsync();
            if (!photo?.uri) return;

            // 1. Guardar en la galería del dispositivo
            await MediaLibrary.saveToLibraryAsync(photo.uri);

            // 2. Encolar para sincronización a Drive (offline -> online)
            await addPhotoToQueue(photo.uri);

            setLastPhotoUri(photo.uri);
        } catch (error) {
            console.error('Error al tomar la foto:', error);
        }
    };

    const zoomScale = zoom === 1 ? 0 : zoom === 2 ? 0.5 : 0;

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.topRightIcons}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => setTimer(!timer)}>
                        <Ionicons
                            name="timer-outline"
                            size={22}
                            color={timer ? '#4DA6FF' : '#FFFFFF'}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={toggleFlash}>
                        <Ionicons
                            name="flash"
                            size={22}
                            color={flash === 'on' ? '#FFD700' : '#FFFFFF'}
                        />
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

                <TouchableOpacity style={styles.shutterButtonOuter} onPress={takePicture}>
                    <View style={styles.shutterButtonInner} />
                </TouchableOpacity>

                <View style={styles.thumbnailWrapper}>
                    <TouchableOpacity style={styles.thumbnailContainer}>
                        {lastPhotoUri ? (
                            <Image source={{ uri: lastPhotoUri }} style={styles.thumbnailImage} />
                        ) : (
                            <View style={[styles.thumbnailImage, { backgroundColor: '#222' }]} />
                        )}
                    </TouchableOpacity>
                    <View style={styles.thumbnailBadge}>
                        <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
                    </View>
                </View>
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
});
