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
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import InputTexto, { InputTextoRef } from '@/components/Inputtexto';
import { ModalCrearTarea } from '@/components/ModalCrearTarea';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useActividad } from '../lib/actividades/ActividadContext';
import { FotoCaptura } from '../lib/actividades/types';

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

    return <PhotoDescribeContent key={foto.idLocal} foto={foto} />;
}


function PhotoDescribeContent({ foto }: { foto: FotoCaptura }) {
    const router = useRouter();
    const campo = useRef<InputTextoRef>(null);
    const { actualizarFoto, eliminarFoto, actividadEnCurso } = useActividad();

    const descripcionGuardada = foto.descripcionIndividual ?? '';
    const subida = !!foto.subidaAlServidor;

    const [editandoDescripcion, setEditandoDescripcion] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const textoBaseRef = useRef('');

    const mostrarInput = !subida || editandoDescripcion;
    const debeMostrarReadonly = !mostrarInput;

    const [estadoTarea, setEstadoTarea] = useState<'conforme' | 'observada' | null>(null);
    const [modalTareaVisible, setModalTareaVisible] = useState(false);

    const [descripcionParaTarea, setDescripcionParaTarea] = useState('');

    useEffect(() => {
        if (editandoDescripcion) {
            const t = setTimeout(() => campo.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [editandoDescripcion]);

    useEffect(() => {
        const subStart = ExpoSpeechRecognitionModule.addListener('start', () => setIsListening(true));
        const subEnd = ExpoSpeechRecognitionModule.addListener('end', () => setIsListening(false));
        const subResult = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
            const texto = event.results[0]?.transcript ?? '';
            if (!texto) return;
            const base = textoBaseRef.current.trimEnd();
            campo.current?.setValue(base.length > 0 ? `${base} ${texto}` : texto);
        });

        return () => {
            subStart.remove();
            subEnd.remove();
            subResult.remove();
        };
    }, []);

    const iniciarBusquedaPorVoz = async () => {
        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!granted) {
            Alert.alert('Permiso denegado', 'Necesitamos acceso al micrófono.');
            return;
        }

        textoBaseRef.current = mostrarInput
            ? (campo.current?.getValue() ?? descripcionGuardada)
            : descripcionGuardada;

        if (!editandoDescripcion) setEditandoDescripcion(true);
        else campo.current?.focus();

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

    const handleEditar = () => setEditandoDescripcion(true);

    const handleCancelarEdicion = () => {
        if (!subida) campo.current?.setValue(descripcionGuardada);
        setEditandoDescripcion(false);
        textoBaseRef.current = '';
    };

    const volverAtras = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)' as any);
        }
    };

    const handleGuardar = async () => {
        const textoFinal = (
            mostrarInput ? (campo.current?.getValue() ?? descripcionGuardada) : descripcionGuardada
        ).trim();

        await actualizarFoto(foto.idLocal, {
            descripcionIndividual: textoFinal,
            subidaAlServidor: false
        });

        setEditandoDescripcion(false);
        textoBaseRef.current = '';
    };

    const guardarEstadoYSalir = async (estado: 'conforme' | 'observada') => {
        const textoFinal = (
            mostrarInput ? (campo.current?.getValue() ?? descripcionGuardada) : descripcionGuardada
        ).trim();

        await actualizarFoto(foto.idLocal, {
            descripcionIndividual: textoFinal,
            subidaAlServidor: false
        });

        setEstadoTarea(estado);
        volverAtras();
    };

    const handleEliminar = () => {
        Alert.alert(
            'Eliminar foto',
            'Esta foto se eliminará de la tarea. Esta acción no se puede deshacer.',
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

    // Función auxiliar que extrae el texto y lo guarda
    const guardarDescripcionActual = async () => {
        const textoFinal = (
            mostrarInput ? (campo.current?.getValue() ?? descripcionGuardada) : descripcionGuardada
        ).trim();

        // Solo guardamos si el texto cambió o si es nuevo
        if (textoFinal !== descripcionGuardada) {
            console.log("💾 Guardando descripción automática:", textoFinal);
            await actualizarFoto(foto.idLocal, { descripcionIndividual: textoFinal });
        }
    };

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
                        <Image source={{ uri: foto.uriLocal }} style={styles.image} resizeMode="contain" />
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

                    <View style={styles.row}>
                        <Text style={styles.sectionLabel}>Descripción individual</Text>

                        <TouchableOpacity
                            style={styles.micButton}
                            onPress={isListening ? detenerBusquedaPorVoz : iniciarBusquedaPorVoz}
                            activeOpacity={0.7}
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
                                <TouchableOpacity style={styles.editBtn} onPress={handleEditar} activeOpacity={0.7}>
                                    <Ionicons name="pencil" size={16} color="#B5121B" />
                                    <Text style={styles.editBtnText}>Editar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.formWrapper}>
                            <InputTexto
                                ref={campo}
                                valorInicial={descripcionGuardada}
                                style={styles.descripcionInput}
                                placeholder="Describe esta foto (opcional)..."
                                placeholderTextColor="#9CA3AF"
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
                                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.editActionBtn, styles.saveBtn]}
                                        onPress={handleGuardar}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.saveBtnText}>Guardar</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                                    <TouchableOpacity
                                        style={[
                                            styles.estadoBtn,
                                            estadoTarea === 'conforme' && styles.estadoBtnActive
                                        ]}
                                        onPress={async () => {
                                            await guardarDescripcionActual();
                                            setEstadoTarea('conforme');
                                            volverAtras();
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.estadoBtnText,
                                            estadoTarea === 'conforme' && styles.estadoBtnTextActive
                                        ]}>Conforme</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.estadoBtn,
                                            estadoTarea === 'observada' && styles.estadoBtnActive
                                        ]}
                                        onPress={async () => {
                                            await guardarDescripcionActual();
                                            setEstadoTarea('observada');
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.estadoBtnText,
                                            estadoTarea === 'observada' && styles.estadoBtnTextActive
                                        ]}>Observada</Text>
                                    </TouchableOpacity>
                                </View>



                            )}
                            {estadoTarea === 'observada' && (
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: '#FFF0F1',
                                        padding: 12,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#FFD0D3'
                                    }}
                                    onPress={() => {
                                        const textoActual = campo.current?.getValue() || descripcionGuardada;
                                        setDescripcionParaTarea(textoActual);
                                        setModalTareaVisible(true);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="add-circle-outline" size={20} color="#910E16" />
                                    <Text style={{ color: '#910E16', marginLeft: 8, fontFamily: 'Poppins-SemiBold', fontSize: 14 }}>
                                        + Crear tarea por observación
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <ModalCrearTarea
                                visible={modalTareaVisible}
                                proyectoId={actividadEnCurso?.proyectoId || 0}
                                estacionId={actividadEnCurso?.estacionId || 0}
                                estacionServicioId={actividadEnCurso?.estacionServicioActividadId || 0}
                                descripcionBase={descripcionParaTarea}
                                onClose={() => setModalTareaVisible(false)}
                                onGuardadoExitoso={() => {
                                    setEstadoTarea('observada');
                                }}
                            />
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

    saveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        backgroundColor: '#B5121B',
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

    estadoBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    estadoBtnActive: {
        borderColor: '#910E16',
        backgroundColor: '#FFF0F1', // Un tono rojizo suave
    },
    estadoBtnText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
        color: '#6B7280',
    },
    estadoBtnTextActive: {
        color: '#910E16',
    },
});