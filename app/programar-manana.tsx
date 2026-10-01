import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import {
    ActividadProgramable,
    programacionService,
} from '../lib/actividades/programacionService';

export default function ProgramarMananaScreen() {
    const insets = useSafeAreaInsets();

    const router = useRouter();
    const params = useLocalSearchParams<{
        estacionId?: string;
        proyectoId?: string;
    }>();

    const estacionId = params.estacionId ? Number(params.estacionId) : null;
    const proyectoId = params.proyectoId ? Number(params.proyectoId) : null;

    const [actividades, setActividades] = useState<ActividadProgramable[]>([]);
    const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());
    const [fechaManana, setFechaManana] = useState<string>('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [servicios, setServicios] = useState<Array<{ id: number; nombre: string }>>([]);

    // Modal crear
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoTipo, setNuevoTipo] = useState('tarea');
    const [nuevoDescripcion, setNuevoDescripcion] = useState('');
    const [creando, setCreando] = useState(false);
    const [serviciosDisponibles, setServiciosDisponibles] = useState<any[]>([]);
    const [servicioSeleccionadoId, setServicioSeleccionadoId] = useState<number | null>(null);

    useEffect(() => {
        if (!estacionId) return;

        programacionService
            .listarProgramables(estacionId)
            .then(({ data, manana }) => {
                setActividades(data);
                setFechaManana(manana);

                // 🔑 Preseleccionar las que ya estaban programadas para mañana
                const set = new Set<number>();
                data.forEach((a) => {
                    if (a.programada_para_manana) set.add(a.id);
                });
                setSeleccionadas(set);
            })
            .catch((err) => Alert.alert('Error', err.message))
            .finally(() => setCargando(false));
    }, [estacionId]);

    useEffect(() => {
        if (modalCrearAbierto && estacionId && servicios.length === 0) {
            programacionService
                .listarServicios(estacionId)
                .then((data) => {
                    setServicios(data);
                    // 🔑 Auto-seleccionar si solo hay 1
                    if (data.length === 1) {
                        setServicioSeleccionadoId(data[0].id);
                    }
                })
                .catch((err) => Alert.alert('Error', err.message));
        }
    }, [modalCrearAbierto, estacionId]);

    const toggleActividad = (id: number) => {
        const nuevo = new Set(seleccionadas);
        if (nuevo.has(id)) nuevo.delete(id);
        else nuevo.add(id);
        setSeleccionadas(nuevo);
    };

    const handleGuardar = async () => {
        if (seleccionadas.size === 0) {
            Alert.alert(
                'Sin actividades',
                'Seleccioná al menos una actividad para mañana.'
            );
            return;
        }

        setGuardando(true);
        try {
            await programacionService.programar(
                Array.from(seleccionadas),
                fechaManana
            );

            Alert.alert(
                '✅ Programación guardada',
                `${seleccionadas.size} actividad(es) programada(s) para mañana.`,
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    const handleCrearActividad = async () => {
        // Validaciones
        if (!nuevoNombre.trim()) {
            Alert.alert('Falta nombre', 'Escribí un nombre para la actividad.');
            return;
        }

        if (!servicioSeleccionadoId) {
            Alert.alert(
                'Falta servicio',
                'Seleccioná a qué servicio pertenece la actividad.'
            );
            return;
        }

        setCreando(true);
        try {
            const nueva = await programacionService.crearActividad({
                nombre: nuevoNombre.trim(),
                tipo: nuevoTipo,
                descripcion: nuevoDescripcion.trim() || undefined,
                estacion_servicio_id: servicioSeleccionadoId,
                programada_para: fechaManana,   // 🔑 Se programa automáticamente para mañana
            });

            // 🔑 Añadir a la lista local
            setActividades((prev) => [...prev, nueva]);

            // 🔑 Marcarla como seleccionada automáticamente
            setSeleccionadas((prev) => new Set(prev).add(nueva.id));

            // Cerrar modal y limpiar
            setModalCrearAbierto(false);
            setNuevoNombre('');
            setNuevoTipo('tarea');
            setNuevoDescripcion('');
            setServicioSeleccionadoId(null);

            Alert.alert('✅ Actividad creada', 'Se agregó a la lista para mañana.');
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'No se pudo crear la actividad');
        } finally {
            setCreando(false);
        }
    };
    if (!estacionId) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />
                <AppHeader variant="back" title="Programar mañana" />
                <View style={styles.center}>
                    <Text style={styles.emptyText}>
                        Falta el ID de estación.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />

            <AppHeader variant="back" title="Programar mañana" />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.infoBox}>
                    <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.infoTitle}>
                            ¿Qué vas a hacer mañana?
                        </Text>
                        <Text style={styles.infoText}>
                            Seleccioná las actividades pendientes o creá nuevas.
                        </Text>
                    </View>
                </View>

                {cargando ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#B5121B" />
                    </View>
                ) : actividades.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="checkmark-done-circle" size={48} color="#9CA3AF" />
                        <Text style={styles.emptyTitle}>Sin actividades pendientes</Text>
                        <Text style={styles.emptyText}>
                            Todas las actividades están completadas. Podés crear una nueva.
                        </Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>Actividades pendientes</Text>

                        {actividades.map((act) => {
                            const marcada = seleccionadas.has(act.id);
                            return (
                                <TouchableOpacity
                                    key={act.id}
                                    style={[
                                        styles.actRow,
                                        marcada && styles.actRowActive,
                                    ]}
                                    onPress={() => toggleActividad(act.id)}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[
                                            styles.checkBox,
                                            marcada && styles.checkBoxActive,
                                        ]}
                                    >
                                        {marcada && (
                                            <Ionicons
                                                name="checkmark"
                                                size={14}
                                                color="#FFFFFF"
                                            />
                                        )}
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={styles.actNombre}
                                            numberOfLines={2}
                                        >
                                            {act.nombre}
                                        </Text>
                                        {act.servicio_nombre && (
                                            <Text style={styles.actServicio}>
                                                {act.servicio_nombre}
                                            </Text>
                                        )}
                                    </View>

                                    {act.estado === 'en_progreso' && (
                                        <View style={styles.estadoBadge}>
                                            <Text style={styles.estadoBadgeText}>
                                                En progreso
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </>
                )}

                {/* Botón crear nueva */}
                <TouchableOpacity
                    style={styles.crearBtn}
                    onPress={() => setModalCrearAbierto(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add-circle-outline" size={20} color="#B5121B" />
                    <Text style={styles.crearBtnText}>Crear nueva actividad</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.footerInfo}>
                    <Text style={styles.footerCount}>
                        {seleccionadas.size} seleccionada
                        {seleccionadas.size !== 1 ? 's' : ''}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.saveBtn, guardando && { opacity: 0.6 }]}
                    onPress={handleGuardar}
                    disabled={guardando}
                    activeOpacity={0.85}
                >
                    {guardando ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                            <Text style={styles.saveBtnText}>Guardar para mañana</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Modal crear */}
            <Modal
                visible={modalCrearAbierto}
                transparent
                animationType="slide"
                onRequestClose={() => setModalCrearAbierto(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Nueva actividad</Text>
                            <TouchableOpacity
                                onPress={() => setModalCrearAbierto(false)}
                            >
                                <Ionicons name="close" size={22} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={styles.inputLabel}>Nombre *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: Reparación de válvula"
                                placeholderTextColor="#9CA3AF"
                                value={nuevoNombre}
                                onChangeText={setNuevoNombre}
                            />

                            <Text style={styles.inputLabel}>Tipo</Text>
                            <View style={styles.tipoRow}>
                                {['tarea', 'inspeccion', 'mantenimiento', 'sistema'].map(
                                    (t) => (
                                        <TouchableOpacity
                                            key={t}
                                            style={[
                                                styles.tipoChip,
                                                nuevoTipo === t && styles.tipoChipActive,
                                            ]}
                                            onPress={() => setNuevoTipo(t)}
                                        >
                                            <Text
                                                style={[
                                                    styles.tipoChipText,
                                                    nuevoTipo === t &&
                                                    styles.tipoChipTextActive,
                                                ]}
                                            >
                                                {t}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>

                            <Text style={styles.inputLabel}>Descripción</Text>
                            <TextInput
                                style={[styles.input, styles.textarea]}
                                placeholder="Opcional..."
                                placeholderTextColor="#9CA3AF"
                                value={nuevoDescripcion}
                                onChangeText={setNuevoDescripcion}
                                multiline
                            />

                            <Text style={styles.inputLabel}>Servicio *</Text>
                            {servicios.length === 0 ? (
                                <View style={styles.noServicios}>
                                    <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
                                    <Text style={styles.noServiciosText}>
                                        Esta estación no tiene servicios configurados.
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.servicioList}>
                                    {servicios.map((s) => {
                                        const activo = servicioSeleccionadoId === s.id;
                                        return (
                                            <TouchableOpacity
                                                key={s.id}
                                                style={[
                                                    styles.servicioChip,
                                                    activo && styles.servicioChipActive,
                                                ]}
                                                onPress={() => setServicioSeleccionadoId(s.id)}
                                                activeOpacity={0.7}
                                            >
                                                <View
                                                    style={[
                                                        styles.radio,
                                                        activo && styles.radioActive,
                                                    ]}
                                                >
                                                    {activo && <View style={styles.radioDot} />}
                                                </View>
                                                <Text
                                                    style={[
                                                        styles.servicioChipText,
                                                        activo && styles.servicioChipTextActive,
                                                    ]}
                                                >
                                                    {s.nombre}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setModalCrearAbierto(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.confirmBtn, creando && { opacity: 0.6 }]}
                                    onPress={handleCrearActividad}
                                    disabled={creando}
                                >
                                    {creando ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.confirmBtnText}>Crear</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ECEDEF' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 24 },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    emptyBox: {
        paddingVertical: 60,
        alignItems: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
        color: '#374151',
        marginTop: 8,
    },

    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#DBEAFE',
        borderLeftWidth: 4,
        borderLeftColor: '#2563EB',
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
    },
    infoTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#1E40AF',
        marginBottom: 2,
    },
    infoText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#1E3A8A',
        lineHeight: 16,
    },

    sectionTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },

    actRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    actRowActive: {
        borderColor: '#B5121B',
        backgroundColor: '#FEF2F2',
    },
    checkBox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkBoxActive: {
        backgroundColor: '#B5121B',
        borderColor: '#B5121B',
    },
    actNombre: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#111827',
    },
    actServicio: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },
    estadoBadge: {
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    estadoBadgeText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 9,
        color: '#1D4ED8',
    },

    crearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#B5121B',
        borderStyle: 'dashed',
        backgroundColor: '#FEF2F2',
    },
    crearBtnText: {
        color: '#B5121B',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },

    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        gap: 10,
    },
    footerInfo: { alignItems: 'center' },
    footerCount: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#6B7280',
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#B5121B',
        borderRadius: 12,
        paddingVertical: 16,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
    },

    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
        color: '#111827',
    },
    inputLabel: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        color: '#374151',
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#111827',
    },
    textarea: { minHeight: 80, paddingTop: 10 },
    tipoRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tipoChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tipoChipActive: {
        backgroundColor: '#FEF2F2',
        borderColor: '#B5121B',
    },
    tipoChipText: {
        fontFamily: 'Poppins-Medium',
        fontSize: 11,
        color: '#6B7280',
        textTransform: 'capitalize',
    },
    tipoChipTextActive: {
        color: '#B5121B',
        fontFamily: 'Poppins-SemiBold',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#6B7280',
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#B5121B',
        alignItems: 'center',
    },
    confirmBtnText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#FFFFFF',
    },

    servicioList: {
        gap: 6,
    },
    servicioChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    servicioChipActive: {
        borderColor: '#B5121B',
        backgroundColor: '#FEF2F2',
    },
    servicioChipText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#374151',
    },
    servicioChipTextActive: {
        fontFamily: 'Poppins-SemiBold',
        color: '#B5121B',
    },
    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioActive: {
        borderColor: '#B5121B',
    },
    radioDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#B5121B',
    },
    noServicios: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FEF3C7',
        borderLeftWidth: 4,
        borderLeftColor: '#D97706',
        borderRadius: 10,
        padding: 12,
    },
    noServiciosText: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#78350F',
    },
});