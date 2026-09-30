import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useActividad } from '../lib/actividades/ActividadContext';

export default function PhotoDescribeScreen() {
    const router = useRouter();
    const { idFotoLocal } = useLocalSearchParams<{ idFotoLocal?: string }>();
    const { actividadEnCurso, actualizarFoto, eliminarFoto } = useActividad();

    const foto = actividadEnCurso?.fotos.find((f) => f.idLocal === idFotoLocal) ?? null;

    const [descripcion, setDescripcion] = useState(
        foto?.descripcionIndividual ?? ''
    );

    useEffect(() => {
        setDescripcion(foto?.descripcionIndividual ?? '');
    }, [foto?.idLocal]);

    const handleGuardar = async () => {
        if (!foto) return;
        await actualizarFoto(foto.idLocal, { descripcionIndividual: descripcion });
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)' as any);
        };
    };

    const handleEliminar = async () => {
        if (!foto) return;
        await eliminarFoto(foto.idLocal);
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)' as any);
        };
    };

    const handleVolver = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)' as any);
        }
    };

    if (!foto) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.emptyWrapper}>
                    <Text style={styles.emptyText}>Foto no encontrada</Text>
                    <TouchableOpacity
                        style={styles.backPill}
                        onPress={handleVolver}
                    >
                        <Text style={styles.backPillText}>Volver</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <View style={styles.header}>
                <TouchableOpacity onPress={handleVolver} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Descripción de foto</Text>
                <TouchableOpacity onPress={handleEliminar} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={22} color="#B5121B" />
                </TouchableOpacity>
            </View>


            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    <View style={styles.imageWrapper}>
                        <Image
                            source={{ uri: foto.uriLocal }}
                            style={styles.image}
                            resizeMode="contain"
                        />
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoText}>
                            {foto.latitud != null && foto.longitud != null
                                ? `${foto.latitud.toFixed(4)}, ${foto.longitud.toFixed(4)}`
                                : 'Sin coordenadas'}
                        </Text>
                        {foto.altitud != null && (
                            <Text style={styles.infoText}>{Math.round(foto.altitud)} m</Text>
                        )}
                    </View>

                    <View style={styles.formWrapper}>
                        <Text style={styles.label}>Descripción individual</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Describe esta foto (opcional)..."
                            placeholderTextColor="#9CA3AF"
                            value={descripcion}
                            onChangeText={setDescripcion}
                            multiline
                            textAlignVertical="top"
                        />
                        <TouchableOpacity style={styles.saveBtn} onPress={handleGuardar}>
                            <Text style={styles.saveBtnText}>Guardar</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    keyboardContainer: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 24 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    iconBtn: { padding: 6 },
    headerTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
        color: '#111827',
    },
    imageWrapper: {
        height: 250,
        backgroundColor: '#F3F4F6',
    },
    image: { width: '100%', height: '100%' },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F9FAFB',
    },
    infoText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#6B7280',
    },
    formWrapper: {
        flex: 1,
        padding: 16,
    },
    label: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        minHeight: 110,
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#111827',
    },
    saveBtn: {
        backgroundColor: '#B5121B',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },

    emptyWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    emptyText: { fontSize: 14, color: '#6B7280' },
    backPill: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#B5121B',
    },
    backPillText: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },
});