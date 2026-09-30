import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../../components/AppHeader';
import SucesoModal from '../../components/sucesos/SucesoModal';
import { useSucesos } from '../../lib/sucesos/SucesosContext';
import { Suceso } from '../../lib/sucesos/types';

export default function SucesosScreen() {
    const {
        sucesosHoy,
        pendientes,
        cargando,
        refrescarSucesos,
        eliminarSuceso,
        sincronizarPendientes,
    } = useSucesos();

    const [modalVisible, setModalVisible] = useState(false);
    const [sucesoEditando, setSucesoEditando] = useState<Suceso | null>(null);

    useFocusEffect(
        useCallback(() => {
            refrescarSucesos();
            sincronizarPendientes();
        }, [refrescarSucesos, sincronizarPendientes])
    );

    const handleEditar = (s: Suceso) => {
        setSucesoEditando(s);
        setModalVisible(true);
    };

    const handleNuevo = () => {
        setSucesoEditando(null);
        setModalVisible(true);
    };

    const handleEliminar = (s: Suceso) => {
        Alert.alert(
            'Eliminar suceso',
            `¿Eliminar "${s.categoria_nombre}"? Esta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await eliminarSuceso(s.id);
                        } catch (err: any) {
                            Alert.alert('Error', err?.message ?? 'No se pudo eliminar');
                        }
                    },
                },
            ]
        );
    };

    const formatearHora = (iso: string) => {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, '0');
        const h = d.getHours();
        const ampm = h >= 12 ? 'pm' : 'am';
        const h12 = h % 12 || 12;
        return `${h12}:${pad(d.getMinutes())} ${ampm}`;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={{ backgroundColor: '#ECEDEF', flex: 1 }}>
                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />

                <AppHeader />

                <View style={styles.topBar}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Sucesos de hoy</Text>
                        <Text style={styles.subtitle}>
                            {sucesosHoy.length} registrado{sucesosHoy.length !== 1 ? 's' : ''}
                            {pendientes.length > 0 && ` · ${pendientes.length} pendiente${pendientes.length !== 1 ? 's' : ''}`}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.newBtn} onPress={handleNuevo}>
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                        <Text style={styles.newBtnText}>Nuevo</Text>
                    </TouchableOpacity>
                </View>

                {cargando && sucesosHoy.length === 0 ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#B5121B" />
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {sucesosHoy.length === 0 && pendientes.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Ionicons
                                    name="checkmark-circle-outline"
                                    size={48}
                                    color="#9CA3AF"
                                />
                                <Text style={styles.emptyTitle}>Sin sucesos registrados</Text>
                                <Text style={styles.emptyText}>
                                    Hoy no se ha registrado ningún suceso de seguridad o clima.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Pendientes offline */}
                                {pendientes.length > 0 && (
                                    <>
                                        <Text style={styles.sectionTitle}>
                                            Pendientes de subir ({pendientes.length})
                                        </Text>
                                        {pendientes.map((p) => (
                                            <View key={p.idLocal} style={[styles.card, styles.cardPendiente]}>
                                                <View style={styles.cardHeader}>
                                                    <View
                                                        style={[
                                                            styles.colorDot,
                                                            { backgroundColor: p.categoria_color ?? '#9CA3AF' },
                                                        ]}
                                                    />
                                                    <Text style={styles.cardTitle}>
                                                        {p.categoria_nombre}
                                                    </Text>
                                                    <View style={styles.pendienteBadge}>
                                                        <Ionicons
                                                            name="cloud-offline-outline"
                                                            size={12}
                                                            color="#92400E"
                                                        />
                                                        <Text style={styles.pendienteText}>Pendiente</Text>
                                                    </View>
                                                </View>
                                                {p.descripcion && (
                                                    <Text style={styles.cardDesc}>
                                                        {p.descripcion}
                                                    </Text>
                                                )}
                                            </View>
                                        ))}
                                        <View style={{ height: 12 }} />
                                    </>
                                )}

                                {/* Registrados */}
                                <Text style={styles.sectionTitle}>Registrados</Text>
                                {sucesosHoy.map((s) => (
                                    <View key={s.id} style={styles.card}>
                                        <View style={styles.cardHeader}>
                                            <View
                                                style={[
                                                    styles.colorDot,
                                                    { backgroundColor: s.categoria_color ?? '#9CA3AF' },
                                                ]}
                                            />
                                            <Text style={styles.cardTitle}>
                                                {s.categoria_nombre}
                                            </Text>
                                            <Text style={styles.cardHora}>
                                                {formatearHora(s.fecha_hora)}
                                            </Text>
                                        </View>

                                        {s.valor != null && (
                                            <Text style={styles.cardValor}>
                                                {s.valor} {s.unidad ?? ''}
                                            </Text>
                                        )}

                                        {s.descripcion && (
                                            <Text style={styles.cardDesc}>{s.descripcion}</Text>
                                        )}

                                        {s.actividad_nombre && (
                                            <View style={styles.cardActividad}>
                                                <Ionicons name="link-outline" size={12} color="#6B7280" />
                                                <Text style={styles.cardActividadText}>
                                                    {s.actividad_nombre}
                                                </Text>
                                            </View>
                                        )}

                                        {(s.puede_editar || s.puede_eliminar) && (
                                            <View style={styles.cardActions}>
                                                {s.puede_editar && (
                                                    <TouchableOpacity
                                                        style={styles.actionBtn}
                                                        onPress={() => handleEditar(s)}
                                                    >
                                                        <Ionicons name="pencil" size={14} color="#B5121B" />
                                                        <Text style={styles.actionBtnText}>Editar</Text>
                                                    </TouchableOpacity>
                                                )}
                                                {s.puede_eliminar && (
                                                    <TouchableOpacity
                                                        style={styles.actionBtn}
                                                        onPress={() => handleEliminar(s)}
                                                    >
                                                        <Ionicons name="trash-outline" size={14} color="#C62828" />
                                                        <Text
                                                            style={[
                                                                styles.actionBtnText,
                                                                { color: '#C62828' },
                                                            ]}
                                                        >
                                                            Eliminar
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </>
                        )}
                    </ScrollView>
                )}


                <SucesoModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    sucesoEditando={sucesoEditando}
                    onGuardado={refrescarSucesos}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffffff' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: '#111827',
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    newBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#B5121B',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    newBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
    sectionTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 12,
        marginBottom: 8,
    },
    emptyBox: {
        paddingVertical: 60,
        alignItems: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
        color: '#374151',
        marginTop: 8,
    },
    emptyText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardPendiente: {
        borderColor: '#FCD34D',
        backgroundColor: '#FFFBEB',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    colorDot: { width: 10, height: 10, borderRadius: 5 },
    cardTitle: {
        flex: 1,
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
        color: '#111827',
    },
    cardHora: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#6B7280',
    },
    pendienteBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    pendienteText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 9,
        color: '#92400E',
    },
    cardValor: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#B5121B',
        marginTop: 4,
    },
    cardDesc: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 18,
        marginTop: 4,
    },
    cardActividad: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    cardActividadText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#6B7280',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionBtnText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 11,
        color: '#B5121B',
    },
});