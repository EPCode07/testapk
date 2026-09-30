import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import { reporteService } from '../lib/reportes/reporteService';

export default function ReporteResumenIAScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ reporteId?: string }>();
    const reporteId = params.reporteId ? Number(params.reporteId) : null;

    const [prompt, setPrompt] = useState('');
    const [resumen, setResumen] = useState('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!reporteId) return;

        reporteService
            .obtenerPrompt(reporteId)
            .then(setPrompt)
            .catch((err) => {
                Alert.alert('Error', err?.message ?? 'No se pudo cargar el prompt');
            })
            .finally(() => setCargando(false));
    }, [reporteId]);

    const handleCopiarPrompt = async () => {
        await Clipboard.setStringAsync(prompt);
        Alert.alert('✅ Copiado', 'El prompt se copió al portapapeles.');
    };

    const handleGuardarResumen = async () => {
        if (!reporteId || !resumen.trim()) {
            Alert.alert('Falta resumen', 'Pegá el resumen que generó la IA.');
            return;
        }

        setGuardando(true);
        try {
            await reporteService.guardarResumen(reporteId, resumen.trim());
            Alert.alert('✅ Guardado', 'El resumen ejecutivo se guardó correctamente.');
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />
                <AppHeader variant="back" title="Resumen IA" />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#B5121B" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={{ backgroundColor: '#ECEDEF', flex: 1 }}>
                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />
                <AppHeader variant="back" title="Resumen IA" />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* PASO 1 */}
                    <View style={styles.stepCard}>
                        <View style={styles.stepHeader}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>1</Text>
                            </View>
                            <Text style={styles.stepTitle}>Copiá el prompt</Text>
                        </View>
                        <Text style={styles.stepDescription}>
                            Pegalo en ChatGPT, Claude o la IA de tu preferencia.
                        </Text>

                        <View style={styles.promptBox}>
                            <Text style={styles.promptText} selectable>
                                {prompt}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.copyBtn}
                            onPress={handleCopiarPrompt}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.copyBtnText}>Copiar prompt</Text>
                        </TouchableOpacity>
                    </View>

                    {/* PASO 2 */}
                    <View style={styles.stepCard}>
                        <View style={styles.stepHeader}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>2</Text>
                            </View>
                            <Text style={styles.stepTitle}>Pegá el resultado</Text>
                        </View>
                        <Text style={styles.stepDescription}>
                            Pegá acá el resumen que te generó la IA.
                        </Text>

                        <TextInput
                            style={styles.textarea}
                            placeholder="Pegá aquí el resumen generado por la IA..."
                            placeholderTextColor="#9CA3AF"
                            value={resumen}
                            onChangeText={setResumen}
                            multiline
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.saveBtn, guardando && { opacity: 0.6 }]}
                            onPress={handleGuardarResumen}
                            disabled={guardando}
                            activeOpacity={0.85}
                        >
                            {guardando ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                                    <Text style={styles.saveBtnText}>Guardar resumen</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffffff' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 10, gap: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    stepCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#B5121B',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
    },
    stepTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
        color: '#111827',
    },
    stepDescription: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 12,
        marginLeft: 38,
    },

    promptBox: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        maxHeight: 260,
        marginBottom: 12,
    },
    promptText: {
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#374151',
        lineHeight: 16,
    },

    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#D97706',
        borderRadius: 10,
        paddingVertical: 12,
    },
    copyBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },

    textarea: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        minHeight: 160,
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#111827',
        marginBottom: 12,
    },

    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#15803D',
        borderRadius: 10,
        paddingVertical: 14,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
});