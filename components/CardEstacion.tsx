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

interface Props {
    estacion: EstacionDetalle;
    onCameraPress: () => void;
}

export default function CardEstacion({ estacion, onCameraPress }: Props) {
    const [expandida, setExpandida] = useState(true);

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

                <TouchableOpacity style={styles.cameraBtn} onPress={onCameraPress}>
                    <Ionicons name="camera-outline" size={22} color="#7A1C1C" />
                </TouchableOpacity>
            </View>

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
        </View>
    );
}

function ActividadItem({
    actividad,
    esUltima,
}: {
    actividad: ActividadDetalle;
    esUltima: boolean;
}) {
    const estadoConfig = getEstadoConfig(actividad.estado);

    return (
        <View style={styles.itemRow}>
            <View style={styles.timelineColumn}>
                <View style={[styles.dot, { backgroundColor: estadoConfig.color }]} />
                {!esUltima && <View style={styles.linea} />}
            </View>

            <View style={styles.itemTextContainer}>
                <Text style={styles.itemText} numberOfLines={1}>
                    {actividad.nombre}
                </Text>
            </View>

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
        </View>
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
    cameraBtn: { padding: 6 },

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
    },
    linea: {
        position: 'absolute',
        top: 20,
        bottom: -10,
        width: 2,
        backgroundColor: '#E5E7EB',
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
});