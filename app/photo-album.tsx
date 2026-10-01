import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SeleccionContexto } from '../components/sucesos/ProyectoEstacionActividadSelector';
import { useActividad } from '../lib/actividades/ActividadContext';
import { exportarActividadAlServidor } from '../lib/actividades/exportarActividad';
import { FotoCaptura } from '../lib/actividades/types';
import { useSync } from '../lib/sync/SyncContext';

import SucesoModal from '@/components/sucesos/SucesoModal';
import {
    ExpoSpeechRecognitionModule,
} from 'expo-speech-recognition';

export default function PhotoAlbumScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ nextActividadId?: string }>();
    const inputRef = useRef<TextInput>(null);
    const [sucesoModalVisible, setSucesoModalVisible] = useState(false);

    const {
        actividadEnCurso,
        actualizarDescripcionGeneral,
        eliminarFoto,
        marcarExportada,
        descartarActividadEnCurso,
        setActividadActual,
        proyectoId,
        marcarFotosSubidas,

    } = useActividad();

    const { addExportacionToQueue } = useSync();

    // ============================================================
    // HOOKS (todos juntos, antes de cualquier return)
    // ============================================================

    const [descripcion, setDescripcion] = useState('');
    const [conforme, setConforme] = useState<boolean | null>(null);
    const [exportando, setExportando] = useState(false);
    const [editandoDescripcion, setEditandoDescripcion] = useState(false);
    const [descripcionTemporal, setDescripcionTemporal] = useState('');
    const [isListening, setIsListening] = useState(false);
    const textoBaseRef = useRef('');   // guarda el texto previo al dictado


    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (actividadEnCurso) {
            setDescripcion(actividadEnCurso.descripcionGeneral ?? '');
            setConforme(actividadEnCurso.conforme ?? null);
        }
    }, [actividadEnCurso?.idLocal]);

    useEffect(() => {
        if (actividadEnCurso) {
        }
    }, [actividadEnCurso]);



    // 🔑 Cleanup del debounce
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        const subStart = ExpoSpeechRecognitionModule.addListener('start', () => {
            setIsListening(true);
        });

        const subEnd = ExpoSpeechRecognitionModule.addListener('end', () => {
            setIsListening(false);
            // 🔑 El baseRef se actualiza en el próximo `iniciarBusquedaPorVoz`
        });

        const subResult = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
            const texto = event.results[0]?.transcript ?? '';
            if (texto) {
                // 🔑 Reemplazar SIEMPRE: textoBase + textoDictado
                const base = textoBaseRef.current.trimEnd();
                const nuevo = base.length > 0 ? `${base} ${texto}` : texto;
                setDescripcionTemporal(nuevo);
            }
        });

        const subError = ExpoSpeechRecognitionModule.addListener('end', () => {
            setIsListening(false);
        });

        return () => {
            subStart.remove();
            subEnd.remove();
            subResult.remove();
            subError.remove();
        };
    }, []);

    const contextoActividad: SeleccionContexto | null = actividadEnCurso
        ? {
            proyectoId: actividadEnCurso.proyectoId,
            proyectoNombre: (actividadEnCurso as any).proyectoNombre ?? '',
            estacionId: actividadEnCurso.estacionId,
            estacionCodigo: (actividadEnCurso as any).estacionCodigo ?? '',
            estacionNombre: (actividadEnCurso as any).estacionNombre ?? '',
            estacionServicioActividadId: actividadEnCurso.estacionServicioActividadId,
            actividadNombre: actividadEnCurso.nombreActividad,
        }
        : null;


    const iniciarBusquedaPorVoz = async () => {
        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!granted) {
            Alert.alert('Permiso denegado', 'Necesitamos acceso al micrófono.');
            return;
        }

        // 🔑 SIEMPRE capturar el texto actual como base
        const textoActual = editandoDescripcion ? descripcionTemporal : descripcion;
        textoBaseRef.current = textoActual;

        // Activar modo edición si no lo está
        if (debeMostrarReadonly) {
            setDescripcionTemporal(textoActual);
            setEditandoDescripcion(true);
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            if (!editandoDescripcion) {
                setDescripcionTemporal(textoActual);
                setEditandoDescripcion(true);
            }
            inputRef.current?.focus();
        }

        ExpoSpeechRecognitionModule.start({
            lang: 'es-ES',
            interimResults: false,
            continuous: false,
            requiresOnDeviceRecognition: false,
            androidIntentOptions: {
                EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000, // 10 segundos
                EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
                EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1500,
            }
        });
    };
    const detenerBusquedaPorVoz = () => {
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
    };

    // ============================================================
    // DERIVADOS (no son hooks, van antes del early return)
    // ============================================================

    const totalFotos = actividadEnCurso?.fotos.length ?? 0;

    const estaExportada =
        actividadEnCurso?.estado === 'exportada' ||
        actividadEnCurso?.estado === 'pendiente_subida';

    const tieneDescripcion =
        (actividadEnCurso?.descripcionGeneral ?? '').length > 0;

    const debeMostrarReadonly =
        estaExportada && tieneDescripcion && !editandoDescripcion;

    // ============================================================
    // EARLY RETURN (ahora sí, después de todos los hooks)
    // ============================================================

    if (!actividadEnCurso) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.emptyWrapper}>
                    <Text style={styles.emptyText}>No hay actividad en curso</Text>
                    <TouchableOpacity
                        style={styles.backPill}
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/(tabs)' as any);
                            }
                        }}
                    >
                        <Text style={styles.backPillText}>Volver</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ============================================================
    // HANDLERS
    // ============================================================

    const handleFotoPress = (foto: FotoCaptura) => {
        router.push({
            pathname: '/photo-description' as any,
            params: { idFotoLocal: foto.idLocal },
        });
    };

    const handleDescartarActividad = () => {
        Alert.alert(
            'Descartar actividad',
            `Se eliminarán ${totalFotos} foto(s) sin exportar. Esta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Descartar',
                    style: 'destructive',
                    onPress: async () => {
                        await descartarActividadEnCurso();
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace('/(tabs)' as any);
                        };
                    },
                },
            ]
        );
    };

    const handleDescripcionChange = (texto: string) => {
        setDescripcion(texto);

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            actualizarDescripcionGeneral(texto, conforme ?? undefined);
        }, 800);
    };

    const handleGuardarEdicion = async () => {
        setDescripcion(descripcionTemporal);
        await actualizarDescripcionGeneral(descripcionTemporal, conforme ?? undefined);
        setEditandoDescripcion(false);
        setDescripcionTemporal('');
        textoBaseRef.current = '';
    };

    const handleCancelarEdicion = () => {
        setEditandoDescripcion(false);
        setDescripcionTemporal('');
    };

    const handleExportar = async () => {
        if (exportando) return;

        if (!conforme) {
            Alert.alert(
                'Falta confirmación',
                'Debes marcar la actividad como Conforme u Observada antes de exportar.'
            );
            return;
        }

        // 🔑 Filtrar SOLO las fotos que no fueron subidas aún
        const fotosNuevas = actividadEnCurso.fotos.filter((f) => !f.subidaAlServidor);

        if (fotosNuevas.length === 0) {
            // No hay fotos nuevas. Si la actividad ya estaba exportada, no hacer nada.
            if (
                actividadEnCurso.estado === 'exportada' ||
                actividadEnCurso.estado === 'pendiente_subida'
            ) {
                Alert.alert(
                    'Sin cambios',
                    'No hay fotos nuevas para subir. Todos los registros ya están en el servidor.'
                );
                return;
            }
            // Si la actividad está en borrador y no hay fotos, error
            Alert.alert(
                'Sin fotos',
                'Debes tomar al menos una foto antes de exportar.'
            );
            return;
        }

        setExportando(true);
        try {
            await actualizarDescripcionGeneral(descripcion, conforme);

            // Guardar en galería SOLO las nuevas
            for (const foto of fotosNuevas) {
                try {
                    await MediaLibrary.saveToLibraryAsync(foto.uriLocal);
                } catch (e) {
                    console.warn('⚠️ No se pudo guardar en galería:', e);
                }
            }

            // 🔑 Payload con SOLO las fotos nuevas
            const actividadParaEnviar = {
                ...actividadEnCurso,
                descripcionGeneral: descripcion,
                conforme: conforme,
                fotos: fotosNuevas,
            };

            const resultado = await exportarActividadAlServidor(actividadParaEnviar);

            if (!resultado.success) {
                await addExportacionToQueue({
                    actividadLocalId: actividadEnCurso.idLocal,
                    estacionServicioActividadId:
                        actividadEnCurso.estacionServicioActividadId,
                    estacionId: actividadEnCurso.estacionId,
                    proyectoId: actividadEnCurso.proyectoId,
                    totalFotos: fotosNuevas.length,
                });

                Alert.alert(
                    '⏳ Guardado localmente',
                    `Las ${fotosNuevas.length} foto(s) nuevas se guardaron en tu galería. Se subirán al servidor automáticamente cuando haya conexión.\n\nMotivo: ${resultado.message}`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                if (proyectoId) {
                                    router.replace(`/proyecto/${proyectoId}` as any);
                                } else {
                                    router.replace('/(tabs)' as any);
                                }
                            },
                        },
                    ]
                );
                return;
            }

            // 🔑 Marcar las fotos como subidas
            await marcarFotosSubidas(fotosNuevas.map((f) => f.idLocal));

            await marcarExportada();

            setSucesoModalVisible(true);

            Alert.alert(
                '✅ Actividad exportada',
                `${fotosNuevas.length} foto(s) subidas al servidor correctamente.`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            if (proyectoId) {
                                router.replace(`/proyecto/${proyectoId}` as any);
                            } else {
                                router.replace('/(tabs)' as any);
                            }
                        },
                    },
                ]
            );
        } catch (e) {
            console.error('❌ Error exportando:', e);
            Alert.alert('Error', 'No se pudo exportar la actividad.');
        } finally {
            setExportando(false);
        }
    };

    // ============================================================
    // JSX
    // ============================================================

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace('/(tabs)' as any);
                        }
                    }}
                    style={styles.iconBtn}
                >
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>

                <View style={styles.titleWrapper}>
                    <Text style={styles.title} numberOfLines={1}>
                        {actividadEnCurso.nombreActividad}
                    </Text>
                    <Text style={styles.subtitle}>
                        {totalFotos} foto{totalFotos !== 1 ? 's' : ''} ·{' '}
                        {actividadEnCurso.estado === 'borrador'
                            ? 'Borrador'
                            : actividadEnCurso.estado === 'pendiente_subida'
                                ? 'Pendiente de subir'
                                : 'Exportada'}
                    </Text>
                </View>

                <TouchableOpacity onPress={handleDescartarActividad} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={22} color="#B5121B" />
                </TouchableOpacity>
            </View>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Grid de fotos */}
                <View style={styles.grid}>
                    {actividadEnCurso.fotos.map((foto) => (
                        <TouchableOpacity
                            key={foto.idLocal}
                            style={styles.gridItem}
                            onPress={() => handleFotoPress(foto)}
                            activeOpacity={0.7}
                        >
                            <Image source={{ uri: foto.uriLocal }} style={styles.gridImage} />
                            {foto.descripcionIndividual ? (
                                <View style={styles.descBadge}>
                                    <Ionicons
                                        name="document-text"
                                        size={10}
                                        color="#FFFFFF"
                                    />
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    ))}

                    {totalFotos === 0 && (
                        <View style={styles.emptyGrid}>
                            <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                            <Text style={styles.emptyGridText}>Sin fotos todavía</Text>
                        </View>
                    )}
                </View>

                {/* Descripción general */}
                <View style={styles.row}>
                    <Text style={styles.sectionLabel}>Descripción general</Text>

                    <TouchableOpacity
                        style={styles.micButtonReadonly}
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
                    // 🔒 Modo readonly
                    <View style={styles.readonlyBox}>
                        <Text style={styles.readonlyText} numberOfLines={12}>
                            {actividadEnCurso.descripcionGeneral}
                        </Text>

                        <View style={styles.readonlyActions}>


                            <TouchableOpacity
                                style={styles.editBtn}
                                onPress={() => {
                                    setDescripcionTemporal(descripcion);
                                    setEditandoDescripcion(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="pencil" size={16} color="#B5121B" />
                                <Text style={styles.editBtnText}>Editar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    // ✏️ Modo editable
                    <>
                        <TextInput
                            ref={inputRef}
                            style={styles.descripcionInput}
                            placeholder="Describe brevemente la actividad realizada..."
                            placeholderTextColor="#9CA3AF"
                            value={editandoDescripcion ? descripcionTemporal : descripcion}
                            onChangeText={
                                editandoDescripcion
                                    ? setDescripcionTemporal
                                    : handleDescripcionChange
                            }
                            multiline
                            numberOfLines={12}
                            textAlignVertical="top"
                        />

                        {editandoDescripcion && (
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
                                    onPress={handleGuardarEdicion}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.saveBtnText}>Guardar cambios</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}

                {/* Conforme / Observado */}
                <Text style={styles.sectionLabel}>Estado de la actividad</Text>
                <View style={styles.decisionRow}>
                    <TouchableOpacity
                        style={[
                            styles.decisionBtn,
                            conforme === true && styles.decisionBtnConforme,
                        ]}
                        onPress={() => setConforme(true)}
                    >
                        <Text
                            style={[
                                styles.decisionText,
                                conforme === true && styles.decisionTextActive,
                            ]}
                        >
                            Conforme
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.decisionBtn,
                            conforme === false && styles.decisionBtnObservado,
                        ]}
                        onPress={() => setConforme(false)}
                    >
                        <Text
                            style={[
                                styles.decisionText,
                                conforme === false && styles.decisionTextActive,
                            ]}
                        >
                            Observada
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.exportBtn, exportando && styles.exportBtnDisabled]}
                    onPress={handleExportar}
                    disabled={exportando}
                    activeOpacity={0.8}
                >
                    {exportando ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons
                                name="cloud-upload-outline"
                                size={20}
                                color="#FFFFFF"
                            />
                            <Text style={styles.exportBtnText}>Exportar actividad</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
            <SucesoModal
                visible={sucesoModalVisible}
                onClose={() => {
                    setSucesoModalVisible(false);
                    if (proyectoId) {
                        router.replace(`/proyecto/${proyectoId}` as any);
                    } else {
                        router.replace('/(tabs)' as any);
                    }
                }}
                contextoActividad={contextoActividad}
            />
        </SafeAreaView>
    );
}

// ============================================================
// ESTILOS
// ============================================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    iconBtn: { padding: 6 },
    titleWrapper: { flex: 1, marginHorizontal: 12 },
    title: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
        color: '#111827',
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },

    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 24 },

    // Grid de fotos
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    gridItem: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#F3F4F6',
        position: 'relative',
    },
    gridImage: { width: '100%', height: '100%' },
    descBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#B5121B',
        borderRadius: 10,
        padding: 4,
    },
    emptyGrid: {
        width: '100%',
        paddingVertical: 40,
        alignItems: 'center',
        gap: 8,
    },
    emptyGridText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#9CA3AF',
    },

    sectionLabel: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#374151',
        marginBottom: 8,
        marginTop: 8,
    },

    // Input editable
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
        marginBottom: 20,
    },

    // Modo readonly
    readonlyBox: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        minHeight: 100,
        marginBottom: 20,
    },
    readonlyText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#374151',
        lineHeight: 19,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-end',
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: '#FEF2F2',
    },
    editBtnText: {
        color: '#B5121B',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
    },

    editActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: -10,
        marginBottom: 20,
    },
    editActionBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
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
        fontSize: 13,
    },
    saveBtn: { backgroundColor: '#B5121B' },
    saveBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },

    // Conforme / Observado
    decisionRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    decisionBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    decisionBtnConforme: {
        backgroundColor: '#B5121B',
        borderColor: '#B5121B',
    },
    decisionBtnObservado: {
        backgroundColor: '#4B5563',
        borderColor: '#4B5563',
    },
    decisionText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#374151',
    },
    decisionTextActive: { color: '#FFFFFF' },

    // Footer exportar
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    exportBtn: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: '#B5121B',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exportBtnDisabled: { opacity: 0.6 },
    exportBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
    },

    // Empty state
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

    readonlyActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 12,
    },
    micButtonReadonly: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
});