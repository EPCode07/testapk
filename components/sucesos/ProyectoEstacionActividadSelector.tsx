import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { proyectoCache } from '../../lib/proyectos/proyectoCache';

export type SeleccionContexto = {
    proyectoId: number;
    proyectoNombre: string;
    estacionId: number;
    estacionCodigo: string;
    estacionNombre: string;
    estacionServicioActividadId: number;
    actividadNombre: string;
};

type Nivel = 'proyecto' | 'estacion' | 'actividad';

type Props = {
    visible: boolean;
    nivel: Nivel;
    onClose: () => void;
    onSelectProyecto?: (p: { id: number; nombre: string }) => void;
    onSelectEstacion?: (e: { id: number; codigo: string; nombre: string }) => void;
    onSelectActividad?: (a: { id: number; nombre: string }) => void;
    // Datos ya seleccionados (para filtrar el siguiente nivel)
    proyectoSeleccionado?: { id: number; nombre: string } | null;
    estacionSeleccionada?: { id: number; codigo: string; nombre: string } | null;
};

export default function ProyectoEstacionActividadSelector({
    visible,
    nivel,
    onClose,
    onSelectProyecto,
    onSelectEstacion,
    onSelectActividad,
    proyectoSeleccionado,
    estacionSeleccionada,
}: Props) {
    const insets = useSafeAreaInsets();
    const [cargando, setCargando] = useState(false);
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        if (!visible) return;

        (async () => {
            setCargando(true);
            try {
                if (nivel === 'proyecto') {
                    const proyectos = (await proyectoCache.leerLista()) ?? [];
                    setItems(
                        proyectos.map((p) => ({
                            id: p.id,
                            nombre: p.nombre,
                            codigo: p.codigo,
                        }))
                    );
                } else if (nivel === 'estacion' && proyectoSeleccionado) {
                    const detalle = await proyectoCache.leerDetalle(proyectoSeleccionado.id);
                    setItems(
                        (detalle?.estaciones ?? []).map((e) => ({
                            id: e.id,
                            nombre: e.nombre,
                            codigo: e.codigo,
                        }))
                    );
                } else if (nivel === 'actividad' && proyectoSeleccionado && estacionSeleccionada) {
                    const detalle = await proyectoCache.leerDetalle(proyectoSeleccionado.id);
                    const est = detalle?.estaciones.find(
                        (e) => e.id === estacionSeleccionada.id
                    );
                    if (est) {
                        const actividades = est.servicios.flatMap((s) =>
                            s.actividades.map((a) => ({
                                id: a.id,
                                nombre: a.nombre,
                                estado: a.estado,
                            }))
                        );
                        setItems(actividades);
                    } else {
                        setItems([]);
                    }
                }
            } catch (err) {
                console.warn('Error cargando opciones:', err);
                setItems([]);
            } finally {
                setCargando(false);
            }
        })();
    }, [visible, nivel, proyectoSeleccionado?.id, estacionSeleccionada?.id]);

    const handleSelect = (item: any) => {
        if (nivel === 'proyecto' && onSelectProyecto) {
            onSelectProyecto({ id: item.id, nombre: item.nombre });
        } else if (nivel === 'estacion' && onSelectEstacion) {
            onSelectEstacion({ id: item.id, codigo: item.codigo, nombre: item.nombre });
        } else if (nivel === 'actividad' && onSelectActividad) {
            onSelectActividad({ id: item.id, nombre: item.nombre });
        }
        onClose();
    };

    const titulo = {
        proyecto: 'Seleccionar proyecto',
        estacion: 'Seleccionar estación',
        actividad: 'Seleccionar actividad',
    }[nivel];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{titulo}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {cargando ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#B5121B" />
                        </View>
                    ) : items.length === 0 ? (
                        <View style={styles.center}>
                            <Ionicons name="alert-circle-outline" size={32} color="#9CA3AF" />
                            <Text style={styles.emptyText}>
                                {nivel === 'actividad'
                                    ? 'Esta estación no tiene actividades asignadas.'
                                    : 'No hay opciones disponibles.\nDescargá datos desde Ajustes.'}
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            contentContainerStyle={styles.listContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {items.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.item}
                                    onPress={() => handleSelect(item)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={
                                            nivel === 'proyecto'
                                                ? 'folder-outline'
                                                : nivel === 'estacion'
                                                    ? 'location-outline'
                                                    : 'clipboard-outline'
                                        }
                                        size={18}
                                        color="#B5121B"
                                    />
                                    <View style={{ flex: 1 }}>
                                        {item.codigo && (
                                            <Text style={styles.itemCodigo}>{item.codigo}</Text>
                                        )}
                                        <Text style={styles.itemNombre} numberOfLines={2}>
                                            {item.nombre}
                                        </Text>
                                        {item.estado && item.estado !== 'pendiente' && (
                                            <Text style={styles.itemEstado}>
                                                {item.estado === 'completado' && '✓ Completado'}
                                                {item.estado === 'observado' && '⚠ Observado'}
                                                {item.estado === 'en_progreso' && '● En progreso'}
                                            </Text>
                                        )}
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
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
    center: { padding: 40, alignItems: 'center', gap: 12 },
    emptyText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    listContent: { padding: 16 },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#F9FAFB',
        marginBottom: 6,
    },
    itemCodigo: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 11,
        color: '#B5121B',
        letterSpacing: 0.3,
    },
    itemNombre: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#111827',
        marginTop: 2,
    },
    itemEstado: {
        fontFamily: 'Poppins-Regular',
        fontSize: 10,
        color: '#6B7280',
        marginTop: 4,
    },
});