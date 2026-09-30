import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSucesos } from '../../lib/sucesos/SucesosContext';
import { Suceso, SucesoCategoria } from '../../lib/sucesos/types';
import NuevaCategoriaModal from './NuevaCategoriaModal';
import ProyectoEstacionActividadSelector, {
    SeleccionContexto,
} from './ProyectoEstacionActividadSelector';
import SucesoCategoriaSelector from './SucesoCategoriaSelector';

type Props = {
    visible: boolean;
    onClose: () => void;
    onGuardado?: () => void;
    sucesoEditando?: Suceso | null;
    // 🔑 Si viene esta prop, es "modo contexto" (desde álbum) - readonly
    contextoActividad?: SeleccionContexto | null;
};

export default function SucesoModal({
    visible,
    onClose,
    onGuardado,
    sucesoEditando = null,
    contextoActividad = null,
}: Props) {
    const insets = useSafeAreaInsets();
    const { categorias, crearSuceso, actualizarSuceso, ultimoContexto, setUltimoContexto } =
        useSucesos();

    const [categoriaSeleccionada, setCategoriaSeleccionada] =
        useState<SucesoCategoria | null>(null);
    const [descripcion, setDescripcion] = useState('');
    const [valor, setValor] = useState('');
    const [guardando, setGuardando] = useState(false);

    const [selectorCatVisible, setSelectorCatVisible] = useState(false);
    const [nuevaCatVisible, setNuevaCatVisible] = useState(false);

    // 🔑 Contexto (proyecto + estación + actividad)
    const [contexto, setContexto] = useState<SeleccionContexto | null>(null);
    const [selectorNivel, setSelectorNivel] = useState<
        'proyecto' | 'estacion' | 'actividad' | null
    >(null);

    const esModoContexto = !!contextoActividad;

    // Reset al abrir
    useEffect(() => {
        if (!visible) return;

        if (sucesoEditando) {
            const cat = categorias.find((c) => c.id === sucesoEditando.categoria_id) ?? null;
            setCategoriaSeleccionada(cat);
            setDescripcion(sucesoEditando.descripcion ?? '');
            setValor(sucesoEditando.valor != null ? String(sucesoEditando.valor) : '');
            setContexto(null);
        } else if (contextoActividad) {
            // Modo contexto: ya viene todo
            setContexto(contextoActividad);
            setCategoriaSeleccionada(null);
            setDescripcion('');
            setValor('');
        } else {
            // Modo tab: precargar última combinación o limpiar
            setContexto(ultimoContexto);
            setCategoriaSeleccionada(null);
            setDescripcion('');
            setValor('');
        }
    }, [visible, sucesoEditando?.id, contextoActividad, ultimoContexto]);

    const handleGuardar = async () => {
        if (!esModoContexto && !contexto) {
            Alert.alert(
                'Falta actividad',
                'Debés elegir proyecto, estación y actividad antes de guardar.'
            );
            return;
        }

        if (!categoriaSeleccionada) {
            Alert.alert('Falta categoría', 'Elegí una categoría para el suceso.');
            return;
        }

        const actividadId = contexto?.estacionServicioActividadId;
        if (!actividadId) {
            Alert.alert('Error', 'No se pudo determinar la actividad.');
            return;
        }

        setGuardando(true);
        try {
            if (sucesoEditando) {
                await actualizarSuceso(sucesoEditando.id, {
                    categoria_id: categoriaSeleccionada.id,
                    descripcion: descripcion.trim() || undefined,
                    valor: valor ? Number(valor) : undefined,
                });
                Alert.alert('✅ Actualizado', 'El suceso se guardó correctamente.');
            } else {
                // GPS
                let lat: number | undefined;
                let lng: number | undefined;
                try {
                    const { status } = await Location.getForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const loc = await Location.getLastKnownPositionAsync();
                        if (loc) {
                            lat = loc.coords.latitude;
                            lng = loc.coords.longitude;
                        }
                    }
                } catch { }

                const res = await crearSuceso({
                    categoria_id: categoriaSeleccionada.id,
                    descripcion: descripcion.trim() || undefined,
                    valor: valor ? Number(valor) : undefined,
                    estacion_servicio_actividad_id: actividadId,
                    latitud: lat,
                    longitud: lng,
                    categoriaSnapshot: categoriaSeleccionada,
                });

                // Guardar la combinación para la próxima
                if (!esModoContexto && contexto) {
                    setUltimoContexto(contexto);
                }

                if (res.offline) {
                    Alert.alert(
                        '⏳ Guardado local',
                        'El suceso se guardó localmente. Se enviará al servidor cuando haya conexión.'
                    );
                } else {
                    Alert.alert('✅ Guardado', 'El suceso se registró correctamente.');
                }
            }

            onGuardado?.();
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {sucesoEditando ? 'Editar suceso' : 'Nuevo suceso'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.body}
                        contentContainerStyle={styles.bodyContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* ====== MODO CONTEXTO: readonly ====== */}
                        {esModoContexto && contextoActividad ? (
                            <>
                                <Text style={styles.label}>Ubicación</Text>
                                <View style={styles.contextoBox}>
                                    <View style={styles.contextoRow}>
                                        <Ionicons name="folder-outline" size={14} color="#6B7280" />
                                        <Text style={styles.contextoText}>
                                            {contextoActividad.proyectoNombre}
                                        </Text>
                                    </View>
                                    <View style={styles.contextoRow}>
                                        <Ionicons name="location-outline" size={14} color="#6B7280" />
                                        <Text style={styles.contextoText}>
                                            {contextoActividad.estacionCodigo} ·{' '}
                                            {contextoActividad.estacionNombre}
                                        </Text>
                                    </View>
                                    <View style={styles.contextoRow}>
                                        <Ionicons name="clipboard-outline" size={14} color="#B5121B" />
                                        <Text style={[styles.contextoText, styles.contextoBold]}>
                                            {contextoActividad.actividadNombre}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        ) : sucesoEditando ? null : (
                            /* ====== MODO TAB: 3 selectores encadenados ====== */
                            <>
                                <Text style={styles.label}>Proyecto *</Text>
                                <TouchableOpacity
                                    style={[styles.selectBtn, contexto && styles.selectBtnActive]}
                                    onPress={() => setSelectorNivel('proyecto')}
                                >
                                    {contexto ? (
                                        <Text style={styles.selectBtnTextActive}>
                                            {contexto.proyectoNombre}
                                        </Text>
                                    ) : (
                                        <Text style={styles.selectBtnText}>
                                            Seleccionar proyecto
                                        </Text>
                                    )}
                                    <Ionicons name="chevron-down" size={18} color="#6B7280" />
                                </TouchableOpacity>

                                <Text style={styles.label}>Estación *</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.selectBtn,
                                        !!contexto?.estacionId && styles.selectBtnActive,
                                        !contexto?.proyectoId && styles.selectBtnDisabled,
                                    ]}
                                    onPress={() =>
                                        contexto?.proyectoId && setSelectorNivel('estacion')
                                    }
                                    disabled={!contexto?.proyectoId}
                                >
                                    {contexto?.estacionId ? (
                                        <Text style={styles.selectBtnTextActive}>
                                            {contexto.estacionCodigo} · {contexto.estacionNombre}
                                        </Text>
                                    ) : (
                                        <Text style={styles.selectBtnText}>
                                            Seleccionar estación
                                        </Text>
                                    )}
                                    <Ionicons name="chevron-down" size={18} color="#6B7280" />
                                </TouchableOpacity>

                                <Text style={styles.label}>Actividad *</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.selectBtn,
                                        !!contexto?.estacionServicioActividadId &&
                                        styles.selectBtnActive,
                                        !contexto?.estacionId && styles.selectBtnDisabled,
                                    ]}
                                    onPress={() =>
                                        contexto?.estacionId && setSelectorNivel('actividad')
                                    }
                                    disabled={!contexto?.estacionId}
                                >
                                    {contexto?.estacionServicioActividadId ? (
                                        <Text style={styles.selectBtnTextActive}>
                                            {contexto.actividadNombre}
                                        </Text>
                                    ) : (
                                        <Text style={styles.selectBtnText}>
                                            Seleccionar actividad
                                        </Text>
                                    )}
                                    <Ionicons name="chevron-down" size={18} color="#6B7280" />
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Categoría */}
                        <Text style={styles.label}>Categoría *</Text>
                        <TouchableOpacity
                            style={[
                                styles.selectBtn,
                                categoriaSeleccionada && styles.selectBtnActive,
                            ]}
                            onPress={() => setSelectorCatVisible(true)}
                        >
                            {categoriaSeleccionada ? (
                                <>
                                    <View
                                        style={[
                                            styles.colorDot,
                                            {
                                                backgroundColor:
                                                    categoriaSeleccionada.color ?? '#9CA3AF',
                                            },
                                        ]}
                                    />
                                    <Text style={styles.selectBtnTextActive}>
                                        {categoriaSeleccionada.nombre}
                                    </Text>
                                </>
                            ) : (
                                <Text style={styles.selectBtnText}>Elegir categoría</Text>
                            )}
                            <Ionicons name="chevron-down" size={18} color="#6B7280" />
                        </TouchableOpacity>

                        {/* Valor */}
                        {categoriaSeleccionada?.unidad && (
                            <>
                                <Text style={styles.label}>
                                    Valor ({categoriaSeleccionada.unidad})
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: 12.5"
                                    placeholderTextColor="#9CA3AF"
                                    value={valor}
                                    onChangeText={setValor}
                                    keyboardType="numeric"
                                />
                            </>
                        )}

                        {/* Descripción */}
                        <Text style={styles.label}>Descripción (opcional)</Text>
                        <TextInput
                            style={[styles.input, styles.textarea]}
                            placeholder="Detalles del suceso..."
                            placeholderTextColor="#9CA3AF"
                            value={descripcion}
                            onChangeText={setDescripcion}
                            multiline
                            textAlignVertical="top"
                        />
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.saveBtn, guardando && { opacity: 0.6 }]}
                        onPress={handleGuardar}
                        disabled={guardando}
                    >
                        {guardando ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                                <Text style={styles.saveBtnText}>
                                    {sucesoEditando ? 'Guardar cambios' : 'Registrar suceso'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Modales anidados */}
            <SucesoCategoriaSelector
                visible={selectorCatVisible}
                categorias={categorias}
                seleccionadaId={categoriaSeleccionada?.id ?? null}
                onSelect={(cat) => {
                    setCategoriaSeleccionada(cat);
                    setSelectorCatVisible(false);
                }}
                onCerrar={() => setSelectorCatVisible(false)}
                onCrearNueva={() => {
                    setSelectorCatVisible(false);
                    setNuevaCatVisible(true);
                }}
            />

            <NuevaCategoriaModal
                visible={nuevaCatVisible}
                onClose={() => setNuevaCatVisible(false)}
                onCreada={(cat) => setCategoriaSeleccionada(cat)}
            />

            {/* Selector de contexto */}
            <ProyectoEstacionActividadSelector
                visible={selectorNivel !== null}
                nivel={selectorNivel ?? 'proyecto'}
                onClose={() => setSelectorNivel(null)}
                proyectoSeleccionado={
                    contexto
                        ? { id: contexto.proyectoId, nombre: contexto.proyectoNombre }
                        : null
                }
                estacionSeleccionada={
                    contexto?.estacionId
                        ? {
                            id: contexto.estacionId,
                            codigo: contexto.estacionCodigo,
                            nombre: contexto.estacionNombre,
                        }
                        : null
                }
                onSelectProyecto={(p) => {
                    // Al cambiar proyecto, resetear estación y actividad
                    setContexto({
                        proyectoId: p.id,
                        proyectoNombre: p.nombre,
                        estacionId: 0,
                        estacionCodigo: '',
                        estacionNombre: '',
                        estacionServicioActividadId: 0,
                        actividadNombre: '',
                    });
                    setSelectorNivel(null);
                    setTimeout(() => setSelectorNivel('estacion'), 300);
                }}
                onSelectEstacion={(e) => {
                    setContexto((prev) =>
                        prev
                            ? {
                                ...prev,
                                estacionId: e.id,
                                estacionCodigo: e.codigo,
                                estacionNombre: e.nombre,
                                estacionServicioActividadId: 0,
                                actividadNombre: '',
                            }
                            : null
                    );
                    setSelectorNivel(null);
                    setTimeout(() => setSelectorNivel('actividad'), 300);
                }}
                onSelectActividad={(a) => {
                    setContexto((prev) =>
                        prev
                            ? {
                                ...prev,
                                estacionServicioActividadId: a.id,
                                actividadNombre: a.nombre,
                            }
                            : null
                    );
                    setSelectorNivel(null);
                }}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    title: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#111827' },
    closeBtn: { padding: 4 },
    body: { maxHeight: 500 },
    bodyContent: { padding: 16 },
    label: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        color: '#374151',
        marginBottom: 6,
        marginTop: 12,
    },

    contextoBox: {
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        padding: 12,
        gap: 6,
    },
    contextoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    contextoText: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#4B5563',
    },
    contextoBold: {
        fontFamily: 'Poppins-SemiBold',
        color: '#B5121B',
    },

    selectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    selectBtnActive: {
        borderColor: '#B5121B',
        backgroundColor: '#FEF2F2',
    },
    selectBtnDisabled: { opacity: 0.5 },
    selectBtnText: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#9CA3AF',
    },
    selectBtnTextActive: {
        flex: 1,
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#B5121B',
    },
    colorDot: { width: 10, height: 10, borderRadius: 5 },
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
    saveBtn: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: '#B5121B',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
});