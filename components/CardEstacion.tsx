import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ActividadDetalle, EstacionDetalle } from '../lib/proyectos/proyectoService';
import { ModalSupervisores } from './ModalSupervisores';

interface Props {
    estacion: EstacionDetalle;
    onRefrescar: () => void;
    onActividadPress: (
        estacionServicioActividadId: number,
        actividadNombre: string,
        estado: 'pendiente' | 'en_progreso' | 'completado' | 'observado'
    ) => void;
    onSubirFotosPress: (id: number, nombre: string) => void;

}


export default function CardEstacion({ estacion, onRefrescar, onActividadPress, onSubirFotosPress }: Props) {
    const [expandida, setExpandida] = useState(true);
    const [modalSupervisores, setModalSupervisores] = useState(false);

    const todasActividades: ActividadDetalle[] = estacion.servicios.flatMap(
        (s) => s.actividades
    );

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerLeft}
                    onPress={() => setExpandida((v) => !v)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.codigo}>{estacion.codigo}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setExpandida((v) => !v)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name={expandida ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color="#111827"
                    />
                </TouchableOpacity>
            </View>

            {expandida && (
                <TouchableOpacity
                    style={styles.btnSupervisores}
                    onPress={() => setModalSupervisores(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="people" size={16} color="#910E16" />
                    <Text style={styles.btnSupervisoresText}>
                        Supervisores de Unidad Minera ({estacion.supervisores_externos?.length || 0})
                    </Text>
                </TouchableOpacity>
            )}

            {expandida && (
                <ScrollView
                    style={styles.timelineScroll}
                    contentContainerStyle={styles.timelineContent}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                >
                    {todasActividades.length === 0 ? (
                        <Text style={styles.empty}>Sin actividades asignadas</Text>
                    ) : (
                        todasActividades.map((act, index) => (
                            <ActividadItem
                                key={act.id}
                                actividad={act}
                                esUltima={index === todasActividades.length - 1}
                                onPress={() => onActividadPress(act.id, act.nombre, act.estado)}
                                onUpload={() => onSubirFotosPress(act.id, act.nombre)}
                            />
                        ))
                    )}
                </ScrollView>
            )}

            <View style={styles.progresoWrapper}>
                <View style={styles.progresoBarra}>
                    <View
                        style={[styles.progresoRelleno, { width: `${estacion.progreso}%` }]}
                    />
                </View>
                <Text style={styles.progresoTexto}>{estacion.progreso}% Completado</Text>
            </View>

            <ModalSupervisores
                visible={modalSupervisores}
                estacionId={estacion.id}
                onClose={() => setModalSupervisores(false)}
                onGuardadoExitoso={onRefrescar}
            />

        </View>
    );
}

function ActividadItem({
    actividad,
    esUltima,
    onPress,
    onUpload
}: {
    actividad: ActividadDetalle;
    esUltima: boolean;
    onPress: () => void;
    onUpload: () => void;
}) {
    const estadoConfig = getEstadoConfig(actividad.estado);
    const estadoDopConfig = getEstadoDop(actividad.estado);
    const esObservacion = actividad.tipo === 'observacion';

    return (
        <TouchableOpacity
            style={[styles.itemRow, esObservacion && { backgroundColor: '#FEF2F2', borderRadius: 8, marginBottom: 4 }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.timelineColumn}>
                <View style={[styles.dot, { backgroundColor: estadoDopConfig.color }]} />
                {!esUltima && <View style={styles.linea} />}
            </View>

            <View style={styles.itemTextContainer}>
                <Text style={styles.itemText} numberOfLines={1}>
                    {actividad.nombre}
                </Text>
            </View>

            <TouchableOpacity
                style={{ padding: 8, marginRight: 8, backgroundColor: '#F3F4F6', borderRadius: 8 }}
                onPress={onUpload}
            >
                <Ionicons name="cloud-upload-outline" size={20} color="#910E16" />
            </TouchableOpacity>

            <View style={styles.itemIcon}>
                {estadoConfig.icono === 'check' && (
                    <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                )}
                {estadoConfig.icono === 'reloj' && (
                    <Ionicons name="time-outline" size={22} color="#F59E0B" />
                )}
                {estadoConfig.icono === 'alerta' && (
                    <Ionicons name="alert-circle" size={22} color="#8B5CF6" />
                )}
                {estadoConfig.icono === 'circulo' && <View style={styles.circuloVacio} />}
            </View>
        </TouchableOpacity>
    );
}

function getEstadoConfig(estado: ActividadDetalle['estado']) {
    switch (estado) {
        case 'completado':
            return { color: '#22C55E', icono: 'check' as const };
        case 'en_progreso':
            return { color: '#F59E0B', icono: 'reloj' as const };
        case 'observado':
            return { color: '#8B5CF6', icono: 'alerta' as const };
        default:
            return { color: '#9CA3AF', icono: 'circulo' as const };
    }
}


function getEstadoDop(estadoDop: ActividadDetalle['estado']) {
    switch (estadoDop) {
        case 'completado':
            return { color: '#910E16', icono: 'check' as const };
        default:
            return { border: '#fbfbffff', icono: 'circulo' as const };
    }
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
        borderBottomWidth: 2,
        borderBottomColor: '#DADADA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    headerLeft: { flex: 1 },
    codigo: {
        color: '#910E16',
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
    },
    timelineScroll: { maxHeight: 260, marginTop: 4 },
    timelineContent: { paddingBottom: 4 },

    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 36,
    },
    timelineColumn: {
        width: 24,
        alignItems: 'center',
        alignSelf: 'stretch',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 13,
        zIndex: 1,
        borderColor: '#910E16',
        borderWidth: 1,
    },
    linea: {
        position: 'absolute',
        top: 22,
        bottom: -14,
        width: 2,
        backgroundColor: '#910E16',
    },
    itemTextContainer: {
        flex: 1,
        paddingVertical: 8,
        paddingLeft: 10,
    },
    itemText: {
        color: '#111827',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
    },
    itemIcon: { paddingHorizontal: 4 },
    circuloVacio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#9CA3AF',
        borderStyle: 'dashed',
    },
    empty: {
        color: '#9CA3AF',
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        paddingVertical: 8,
    },
    progresoWrapper: { marginTop: 12 },
    progresoBarra: {
        height: 5,
        backgroundColor: '#E5E7EB',
        borderRadius: 9999,
        overflow: 'hidden',
    },
    progresoRelleno: {
        height: '100%',
        backgroundColor: '#B5121B',
        borderRadius: 9999,
    },
    progresoTexto: {
        color: '#6B7280',
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        marginTop: 6,
    },
    btnSupervisores: {
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
        backgroundColor: '#FFF0F1',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
        gap: 6,
    },
    btnSupervisoresText: {
        color: '#910E16',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
});