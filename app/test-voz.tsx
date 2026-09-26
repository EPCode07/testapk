import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TestVoz() {
    const [resultado, setResultado] = useState<string>('');
    const [isListening, setIsListening] = useState(false);

    // 👇 Ver idiomas disponibles
    const verIdiomasDisponibles = async () => {
        try {
            const result = await ExpoSpeechRecognitionModule.getSupportedLocales({});
            console.log('🌐 Idiomas soportados:', result.locales);
            console.log('✅ Idiomas instalados:', result.installedLocales);

            const tieneEspanol = result.installedLocales.some((l) => l.startsWith('es'));
            console.log('¿Tiene español instalado?', tieneEspanol ? '✅ Sí' : '❌ No');

            const tienePe = result.installedLocales.includes('es-PE');
            const tieneEs = result.installedLocales.includes('es-ES');
            console.log('es-PE:', tienePe ? '✅' : '❌', '| es-ES:', tieneEs ? '✅' : '❌');

            setResultado(
                `Soportados: ${result.locales.length}\nInstalados: ${result.installedLocales.length}\n\n` +
                `Español: ${tieneEspanol ? 'SÍ' : 'NO'}\n` +
                `es-PE: ${tienePe ? 'SÍ' : 'NO'}\n` +
                `es-ES: ${tieneEs ? 'SÍ' : 'NO'}`
            );
        } catch (error: any) {
            console.error('❌ Error:', error);
            setResultado(`Error: ${error.message ?? JSON.stringify(error)}`);
        }
    };

    // 👇 Descargar español (Android)
    const descargarIdiomaEspanol = async () => {
        try {
            const result = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
                locale: 'es-ES',
            });
            console.log('📥 Resultado descarga:', result);
            setResultado(`Descarga: ${JSON.stringify(result)}`);
        } catch (error: any) {
            console.error('❌ Error al descargar:', error);
            setResultado(`Error: ${error.message ?? JSON.stringify(error)}`);
        }
    };

    // 👇 Probar reconocimiento en español
    const probarReconocimiento = async () => {
        try {
            const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!granted) {
                Alert.alert('Permiso denegado', 'Necesitamos acceso al micrófono.');
                return;
            }

            setResultado('Escuchando...');
            setIsListening(true);

            ExpoSpeechRecognitionModule.start({
                lang: 'es-ES',
                interimResults: true,
                continuous: false,
                requiresOnDeviceRecognition: false, // false = intenta con red si falla offline
            });
        } catch (error: any) {
            console.error('❌ Error al iniciar:', error);
            setIsListening(false);
            setResultado(`Error: ${error.message ?? JSON.stringify(error)}`);
        }
    };

    const detenerReconocimiento = () => {
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
    };

    // 👇 Listeners de eventos
    React.useEffect(() => {
        const subStart = ExpoSpeechRecognitionModule.addListener('start', () => {
            console.log('🎤 Reconocimiento iniciado');
            setIsListening(true);
        });

        const subEnd = ExpoSpeechRecognitionModule.addListener('end', () => {
            console.log('🔇 Reconocimiento terminado');
            setIsListening(false);
        });

        const subResult = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
            const texto = event.results[0]?.transcript ?? '';
            console.log('📝 Texto:', texto);
            setResultado(`Texto detectado:\n${texto}`);
        });

        const subError = ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
            console.error('❌ Error de reconocimiento:', event.error, event.message);
            setResultado(`Error: ${event.error}\n${event.message}`);
            setIsListening(false);
        });

        return () => {
            subStart.remove();
            subEnd.remove();
            subResult.remove();
            subError.remove();
        };
    }, []);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Test Voz</Text>

            <TouchableOpacity
                onPress={verIdiomasDisponibles}
                style={[styles.button, { backgroundColor: '#7c3aed' }]}
            >
                <Text style={styles.buttonText}>🌐 Ver idiomas disponibles</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={descargarIdiomaEspanol}
                style={[styles.button, { backgroundColor: '#059669' }]}
            >
                <Text style={styles.buttonText}>📥 Descargar español (Android)</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={isListening ? detenerReconocimiento : probarReconocimiento}
                style={[styles.button, { backgroundColor: isListening ? '#dc3545' : '#007bff' }]}
            >
                <Text style={styles.buttonText}>
                    {isListening ? '⏹ Detener' : '🎤 Probar reconocimiento (es-ES)'}
                </Text>
            </TouchableOpacity>

            {resultado !== '' && (
                <View style={styles.result}>
                    <Text style={styles.resultText}>{resultado}</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    button: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12, marginVertical: 8, minWidth: 280, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    result: { marginTop: 20, padding: 20, backgroundColor: '#fff', borderRadius: 12, width: '100%' },
    resultText: { fontSize: 14, color: '#333', lineHeight: 22 },
});