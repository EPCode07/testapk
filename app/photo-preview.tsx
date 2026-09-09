import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useSync } from '../lib/sync/SyncContext';

export default function PhotoPreviewScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const watermarkedUri = params.watermarkedUri as string;
    const { addPhotoToQueue } = useSync();

    const [description, setDescription] = useState('');
    const [isConforme, setIsConforme] = useState<boolean | null>(true);
    const handleNotConforme = () => {
        console.log('🔄 Foto no conforme, regresando a la cámara...');
        router.back();
    };

    const handleSaveAndAdvance = async () => {
        if (isConforme === false) {
            router.back();
            return;
        }

        try {
            console.log('💾 Guardando en local y enviando a cola con descripción:', description);

            // 1. Guardar en la galería del dispositivo la foto con marca de agua
            if (watermarkedUri) {
                await MediaLibrary.saveToLibraryAsync(watermarkedUri);
                console.log('✅ Foto con marca de agua guardada en galería');
            }

            // 2. Agregar a la cola de sincronización (URI + la descripción que escribió el usuario)
            await addPhotoToQueue(watermarkedUri, description);

            // 3. Regresar o avanzar a la siguiente pantalla del flujo
            router.back();
        } catch (error) {
            console.error('❌ Error al guardar y avanzar:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            {/* 1. Imagen principal con la marca de agua ya aplicada */}
            <View style={styles.imageContainer}>
                {watermarkedUri ? (
                    // IMPORTANTE: "contain" en vez de "cover" — así se ve la foto COMPLETA
                    // (header con logo + card inferior) sin recortar nada. "cover" recortaba
                    // el header porque la proporción del contenedor no coincide con la de la foto.
                    <Image source={{ uri: watermarkedUri }} style={styles.previewImage} resizeMode="contain" />
                ) : null}
            </View>

            {/* 2. Sección del Formulario y Controles Inferiores */}
            <View style={styles.formContainer}>

                {/* Input de Descripción */}
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Agregar descripción"
                        placeholderTextColor="#888888"
                        value={description}
                        onChangeText={setDescription}
                    />
                    <TouchableOpacity style={styles.micButton}>
                        <Text style={styles.micIcon}>🎤</Text>
                    </TouchableOpacity>
                </View>

                {/* Botones Conforme / No conforme */}
                <View style={styles.decisionContainer}>
                    <TouchableOpacity
                        style={[styles.decisionButton, isConforme === true && styles.conformeActive]}
                        onPress={() => setIsConforme(true)}
                    >
                        <Text style={[styles.decisionText, isConforme === true && styles.textActive]}>Conforme</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.decisionButton, isConforme === false && styles.noConformeActive]}
                        onPress={() => {
                            setIsConforme(false);
                            handleNotConforme(); // Regresa de inmediato a la cámara
                        }}
                    >
                        <Text style={[styles.decisionText, isConforme === false && styles.textActive]}>No conforme</Text>
                    </TouchableOpacity>
                </View>

                {/* Pie de página con textos informativos y botón de avanzar */}
                <View style={styles.footerRow}>
                    <View>
                        <Text style={styles.locationTitle}>Uchucchacua</Text>
                        <Text style={styles.locationSubtitle}>EU - 1</Text>
                    </View>

                    <TouchableOpacity style={styles.nextButton} onPress={handleSaveAndAdvance}>
                        <Text style={styles.arrowIcon}>➔</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    imageContainer: {
        flex: 1,
        margin: 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#111',
        // Centra la imagen "contain" dentro del recuadro (deja franjas negras
        // a los lados si la proporción no calza exacto, no es un error).
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    formContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        marginBottom: 14,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: '#000000',
    },
    micButton: {
        padding: 4,
    },
    micIcon: {
        fontSize: 18,
    },
    decisionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
    },
    decisionButton: {
        flex: 1,
        height: 48,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    conformeActive: {
        backgroundColor: '#8B1E24', // Tono rojo corporativo oscuro estilo Yhoma
        borderColor: '#8B1E24',
    },
    noConformeActive: {
        backgroundColor: '#333333',
        borderColor: '#555555',
    },
    decisionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333333',
    },
    textActive: {
        color: '#FFFFFF',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    locationTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    locationSubtitle: {
        color: '#AAAAAA',
        fontSize: 13,
        marginTop: 2,
    },
    nextButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#8B1E24',
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowIcon: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
});