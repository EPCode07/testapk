import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useSync } from '../lib/sync/SyncContext';

import { showMessage } from "react-native-flash-message";


import CustomAlert from '../components/CustomAlert';

export default function PhotoPreviewScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const watermarkedUri = params.watermarkedUri as string;
    const { addPhotoToQueue } = useSync();

    const [description, setDescription] = useState('');
    const [isConforme, setIsConforme] = useState<boolean | null>(null);

    const [isAlertVisible, setIsAlertVisible] = useState(false);

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

            if (watermarkedUri) {
                await MediaLibrary.saveToLibraryAsync(watermarkedUri);
                console.log('✅ Foto con marca de agua guardada en galería');
            }

            await addPhotoToQueue(watermarkedUri, description);

            router.back();
        } catch (error) {
            console.error('❌ Error al guardar y avanzar:', error);
        }
    };


    // Función para cuando el usuario presiona "Aceptar" en la alerta
    const handleOnAmazonAccept = () => {
        console.log("Usuario aceptó la notificación de Amazon. Abriendo el carrito...");
        // Aquí iría tu lógica de navegación o acción
        // Por ejemplo: navigation.navigate('Cart');
    };


    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            <View style={styles.imageContainer}>
                {watermarkedUri ? (
                    <Image source={{ uri: watermarkedUri }} style={styles.previewImage} resizeMode="contain" />
                ) : null}
            </View>

            <View style={styles.formContainer}>

                <View style={styles.inputWrapper}>
                    <TextInput
                        style={[
                            styles.textInput,
                        ]}
                        placeholder="Escribe la descripción aquí..."
                        value={description}
                        onChangeText={setDescription}
                        editable={isConforme !== true}
                        multiline
                    />


                    <TouchableOpacity style={styles.micButton}>
                        <Text style={styles.micIcon}>🎤</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.decisionContainer}>
                    <TouchableOpacity
                        style={[styles.decisionButton, isConforme === true && styles.conformeActive]}
                        onPress={() => {
                            setIsConforme(true);
                            // showMessage({
                            //     message: "Notificación",
                            //     description: "Descripción bloqueada",
                            //     type: "danger", // Puede ser "success", "warning", "danger", "info"
                            //     icon: "danger",
                            //     floating: true, // Le da un diseño más moderno flotante con bordes redondeados
                            // });
                            setIsAlertVisible(true);
                        }}
                    >
                        <Text style={[styles.decisionText, isConforme === true && styles.textActive]}>Conforme</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.decisionButton, isConforme === false && styles.noConformeActive]}
                        onPress={() => {
                            setIsConforme(false);
                            setDescription('');
                            handleNotConforme();
                            setIsAlertVisible(false);
                        }}
                    >
                        <Text style={[styles.decisionText, isConforme === false && styles.textActive]}>No conforme</Text>
                    </TouchableOpacity>

                    <CustomAlert
                        visible={isAlertVisible}
                        appName="Yhoma Reportes"
                        appIconSource={require('../assets/images/app-logo.png')}
                        title='Foto Conforme'
                        message='Descripción guardada correctamente.'

                        onClose={() => setIsAlertVisible(false)}
                        onAccept={handleOnAmazonAccept}
                    />
                </View>

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
        backgroundColor: '#8B1E24',
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

    mainButton: {
        backgroundColor: '#007aff',
        paddingVertical: 16,
        paddingHorizontal: 28,
        borderRadius: 14,
        shadowColor: '#007aff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },

    mainButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
});