// app/photo-description.tsx

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
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

import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useActividad } from '../lib/actividades/ActividadContext';
import { FotoCaptura } from '../lib/actividades/types';

// ============================================================
// ROUTE COMPONENT
// ============================================================
export default function PhotoDescribeScreen() {
    const router = useRouter();
    const { idFotoLocal } = useLocalSearchParams<{ idFotoLocal?: string }>();
    const { actividadEnCurso } = useActividad();

    const foto =
        actividadEnCurso?.fotos.find((f) => f.idLocal === idFotoLocal) ?? null;

    const handleVolver = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)' as any);
        }
    };

    if (!foto) {
        return <FotoNoEncontrada onVolver={handleVolver} />;
    }

    // key={foto.idLocal} → remount completo cuando cambia la foto.
    // El estado interno del hijo se reinicia solo, sin efectos ni
    // ajustes manuales. Ver:
    // https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes
    return <PhotoDescribeContent key={foto.idLocal} foto={foto} />;
}

// ============================================================
// CONTENIDO (se remonta por key)
// ============================================================
function PhotoDescribeContent({ foto }: { foto: FotoCaptura }) {
    const router = useRouter();
    const inputRef = useRef<TextInput>(null);
    const { actualizarFoto, eliminarFoto } = useActividad();

    // Estado inicial derivado directamente de la prop.
    // Gracias al key del padre, no necesitamos sincronizar nada.
    const [descripcion, setDescripcion] = useState(
        foto.descripcionIndividual ?? ''
    );
    const [editandoDescripcion, setEditandoDescripcion] = useState(false);
    const [descripcionTemporal, setDescripcionTemporal] = useState('');
    const [isListening, setIsListening] = useState(false);

    const textoBaseRef = useRef('');

    const debeMostrarReadonly =
        !!foto.subidaAlServidor && !editandoDescripcion;

    // ------------------------------------------------------------
    // Foco automático al entrar en edición (no es setState → ok)
    // ------------------------------------------------------------
    useEffect(() => {
        if (editandoDescripcion) {
            const t = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [editandoDescripcion]);

    // ------------------------------------------------------------
    // Voz: suscripción externa (uso legítimo de useEffect)
    // ------------------------------------------------------------
    useEffect(() => {
        const subStart = ExpoSpeechRecognitionModule.addListener(
            'start',
            () => setIsListening(true)
        );

        const subEnd = ExpoSpeechRecognitionModule.addListener(
            'end',
            () => setIsListening(false)
        );

        const subResult = ExpoSpeechRecognitionModule.addListener(
            'result',
            (event: any) => {
                const texto = event.results[0]?.transcript ?? '';
                if (!texto) return;
                const base = textoBaseRef.current.trimEnd();
                const nuevo = base.length > 0 ? `${base} ${texto}` : texto;
                setDescripcionTemporal(nuevo);
            }
        );

        return () => {
            subStart.remove();
            subEnd.remove();
            subResult.remove();
        };
    }, []);

    // ------------------------------------------------------------
    // Voz: handlers
    // ------------------------------------------------------------
    const iniciarBusquedaPorVoz = async () => {
        const { granted } =
            await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!granted) {
            Alert.alert('Permiso denegado', 'Necesitamos acceso al micrófono.');
            return;
        }

        const textoActual = editandoDescripcion
            ? descripcionTemporal
            : descripcion;
        textoBaseRef.current = textoActual;

        if (!editandoDescripcion) {
            setDescripcionTemporal(textoActual);
            setEditandoDescripcion(true);
        } else {
            // Ya estamos editando → asegurar foco (el useEffect no dispara)
            inputRef.current?.focus();
        }

        ExpoSpeechRecognitionModule.start({
            lang: 'es-ES',
            interimResults: false,
            continuous: false,
            requiresOnDeviceRecognition: false,
            androidIntentOptions: {
                EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
                EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
                EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1500,
            },
        });
    };

    const detenerBusquedaPorVoz = () => {
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
    };

    // ------------------------------------------------------------
    // Handlers de edición
    // ------------------------------------------------------------
    const handleEditar = () => {
        setDescripcionTemporal(descripcion);
        setEditandoDescripcion(true);
    };

    const handleCancelarEdicion = () => {
        setEditandoDescripcion(false);
        setDescripcionTemporal('');
        textoBaseRef.current = '';
    };

    // ------------------------------------------------------------
    // Guardar / eliminar / volver
    // ------------------------------------------------------------
    const volverAtras = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)' as any);
        }
    };

    const handleGuardar = async () => {
        const textoFinal = editandoDescripcion
            ? descripcionTemporal.trim()
            : descripcion.trim();

        await actualizarFoto(foto.idLocal, {
            descripcionIndividual: textoFinal,
        });

        volverAtras();
    };

    const handleEliminar = () => {
        Alert.alert(
            'Eliminar foto',
            'Esta foto se eliminará de la actividad. Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        await eliminarFoto(foto.idLocal);
                        volverAtras();
                    },
                },
            ]
        );
    };

    // ------------------------------------------------------------
    // Render
    // ------------------------------------------------------------
    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <View style={styles.header}>
                <TouchableOpacity onPress={volverAtras} style={styles.iconBtn}>
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
                            <Text style={styles.infoText}>
                                {Math.round(foto.altitud)} m
                            </Text>
                        )}
                    </View>

                    {/* Label + Micrófono */}
                    <View style={styles.row}>
                        <Text style={styles.sectionLabel}>Descripción individual</Text>

                        <TouchableOpacity
                            style={styles.micButton}
                            onPress={
                                isListening
                                    ? detenerBusquedaPorVoz
                                    : iniciarBusquedaPorVoz
                            }
                            activeOpacity={0.7}
                            disabled={debeMostrarReadonly && !editandoDescripcion ? false : false}
                        >
                            <Ionicons
                                name={isListening ? 'mic' : 'mic-outline'}
                                size={18}
                                color={isListening ? '#B5121B' : '#6B7280'}
                            />
                        </TouchableOpacity>
                    </View>

                    {debeMostrarReadonly ? (
                        <View style={styles.readonlyBox}>
                            <Text style={styles.readonlyText} numberOfLines={12}>
                                {foto.descripcionIndividual || 'Sin descripción'}
                            </Text>

                            <View style={styles.readonlyActions}>
                                <TouchableOpacity
                                    style={styles.editBtn}
                                    onPress={handleEditar}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name="pencil"
                                        size={16}
                                        color="#B5121B"
                                    />
                                    <Text style={styles.editBtnText}>Editar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.formWrapper}>
                            <TextInput
                                ref={inputRef}
                                style={styles.descripcionInput}
                                placeholder="Describe esta foto (opcional)..."
                                placeholderTextColor="#9CA3AF"
                                value={
                                    editandoDescripcion
                                        ? descripcionTemporal
                                        : descripcion
                                }
                                onChangeText={
                                    editandoDescripcion
                                        ? setDescripcionTemporal
                                        : setDescripcion
                                }
                                multiline
                                textAlignVertical="top"
                            />

                            {editandoDescripcion ? (
                                <View style={styles.editActions}>
                                    <TouchableOpacity
                                        style={[styles.editActionBtn, styles.cancelBtn]}
                                        onPress={handleCancelarEdicion}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.cancelBtnText}>
                                            Cancelar
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.editActionBtn, styles.saveBtn]}
                                        onPress={handleGuardar}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.saveBtnText}>
                                            Guardar
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.saveBtn}
                                    onPress={handleGuardar}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.saveBtnText}>Guardar</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ============================================================
// ESTADO VACÍO
// ============================================================
function FotoNoEncontrada({ onVolver }: { onVolver: () => void }) {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.emptyWrapper}>
                <Text style={styles.emptyText}>Foto no encontrada</Text>
                <TouchableOpacity style={styles.backPill} onPress={onVolver}>
                    <Text style={styles.backPillText}>Volver</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { paddingBottom: 24 },

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

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
    },
    sectionLabel: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#374151',
    },
    micButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },

    formWrapper: {
        flex: 1,
        padding: 16,
    },
    descripcionInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        minHeight: 100,
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

    editActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    editActionBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    cancelBtnText: {
        color: '#6B7280',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },

    readonlyBox: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginHorizontal: 16,
    },
    readonlyText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#111827',
        lineHeight: 22,
    },
    readonlyActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 12,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#FEF2F2',
    },
    editBtnText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        color: '#B5121B',
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
    backPillText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
    },
});