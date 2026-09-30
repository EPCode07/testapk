import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import NetInfo from '@react-native-community/netinfo';
import AppHeader from '../components/AppHeader';
import { proyectoService } from '../lib/proyectos/proyectoService';
import { reporteService, ResumenDia } from '../lib/reportes/reporteService';

type EstacionItem = {
    id: number;
    codigo: string;
    nombre: string;
};

export default function CerrarDiaScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        proyectoId?: string;
        estacionId?: string;
        reporteId?: string;
    }>();

    const proyectoId = params.proyectoId ? Number(params.proyectoId) : null;
    const estacionIdParam = params.estacionId ? Number(params.estacionId) : null;
    const reporteIdParam = params.reporteId ? Number(params.reporteId) : null;
    const esCorreccion = !!reporteIdParam;

    const [estacionSeleccionadaId, setEstacionSeleccionadaId] = useState<number | null>(
        estacionIdParam
    );
    const [estaciones, setEstaciones] = useState<EstacionItem[]>([]);
    const [cargandoEstaciones, setCargandoEstaciones] = useState(false);

    const [resumen, setResumen] = useState<ResumenDia | null>(null);
    const [cargando, setCargando] = useState(false);
    const [cerrando, setCerrando] = useState(false);

    const [observaciones, setObservaciones] = useState('');
    const [diasConAccidentes, setDiasConAccidentes] = useState(false);
    const [diasConLluvia, setDiasConLluvia] = useState(false);

    // ============================================================
    // Cargar estaciones del proyecto
    // ============================================================
    useEffect(() => {
        if (!proyectoId) return;

        setCargandoEstaciones(true);
        proyectoService
            .detalle(proyectoId)
            .then((detalle) => {
                const lista = (detalle.estaciones ?? []).map((e) => ({
                    id: e.id,
                    codigo: e.codigo,
                    nombre: e.nombre,
                }));
                setEstaciones(lista);

                // 🔑 Si no hay estación seleccionada y solo hay 1, elegirla automáticamente
                if (!estacionSeleccionadaId && lista.length === 1) {
                    setEstacionSeleccionadaId(lista[0].id);
                }
            })
            .catch((err) => {
                Alert.alert('Error', err?.message ?? 'No se pudieron cargar las estaciones');
            })
            .finally(() => setCargandoEstaciones(false));
    }, [proyectoId]);

    // ============================================================
    // Cargar resumen del día cuando hay estación seleccionada
    // ============================================================
    useEffect(() => {
        if (!estacionSeleccionadaId) {
            setResumen(null);
            return;
        }

        setCargando(true);
        reporteService
            .resumenDia(estacionSeleccionadaId)
            .then(setResumen)
            .catch((err) => {
                Alert.alert('Error', err?.message ?? 'No se pudo obtener el resumen');
            })
            .finally(() => setCargando(false));
    }, [estacionSeleccionadaId]);

    const handleCerrarDia = async () => {
        if (!estacionSeleccionadaId) return;

        const net = await NetInfo.fetch();
        const isOnline = !!net.isConnected && net.isInternetReachable !== false;

        if (!isOnline) {
            Alert.alert(
                'Sin conexión',
                'Necesitás conexión a internet para cerrar el día. Conectate y volvé a intentar.'
            );
            return;
        }

        if (!resumen || resumen.total_fotos === 0) {
            Alert.alert(
                'Sin fotos',
                'No hay fotos registradas hoy en esta estación. No se puede cerrar el día.'
            );
            return;
        }

        setCerrando(true);
        try {
            const resultado = await reporteService.cerrarDia({
                estacion_id: estacionSeleccionadaId,
                observaciones: observaciones.trim() || undefined,
                dias_con_accidentes: diasConAccidentes,
                dias_con_lluvia: diasConLluvia,
                reporte_id: reporteIdParam ?? undefined,
            });

            // ⚠️ Caso: Ya existía un reporte hoy
            if (resultado.es_duplicado) {
                setCerrando(false);
                Alert.alert(
                    'ℹ️ Reporte en curso',
                    `Ya hay un reporte para hoy: ${resultado.reporte?.codigo ?? ''}.\n\n¿Querés agregar las fotos nuevas al reporte existente?`,
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Sí, agregar',
                            onPress: async () => {
                                setCerrando(true);
                                try {
                                    const resultadoDuplicado = await reporteService.cerrarDia({
                                        estacion_id: estacionSeleccionadaId,
                                        observaciones: observaciones.trim() || undefined,
                                        dias_con_accidentes: diasConAccidentes,
                                        dias_con_lluvia: diasConLluvia,
                                        reporte_id: resultado.reporte?.id,
                                    });

                                    Alert.alert(
                                        '✅ Fotos agregadas',
                                        `${resultadoDuplicado.fotos_agregadas ?? 0} foto(s) se agregaron al reporte ${resultadoDuplicado.reporte?.codigo ?? resultado.reporte?.codigo ?? ''}.`,
                                        [
                                            {
                                                text: 'Ver reporte',
                                                onPress: () => router.replace({
                                                    pathname: '/reporte-detalle' as any,
                                                    params: { reporteId: String(resultadoDuplicado.reporte?.id ?? resultado.reporte?.id) },
                                                }),
                                            },
                                        ]
                                    );
                                } catch (dupErr: any) {
                                    Alert.alert('Error', dupErr?.message ?? 'No se pudieron agregar las fotos al reporte existente');
                                } finally {
                                    setCerrando(false);
                                }
                            },
                        },
                    ]
                );
                return;
            }

            // ✅ Caso: Modo subsanar / corrección
            if (esCorreccion) {
                Alert.alert(
                    '✅ Correcciones agregadas',
                    `${resultado.fotos_agregadas ?? 0} foto(s) se agregaron al reporte ${resultado.reporte?.codigo ?? ''}.`,
                    [
                        {
                            text: 'Ver reporte',
                            onPress: () => router.replace({
                                pathname: '/reporte-detalle' as any,
                                params: { reporteId: String(reporteIdParam ?? resultado.reporte?.id) },
                            }),
                        },
                    ]
                );
            } else {
                // ✅ Flujo normal: Reporte nuevo creado
                Alert.alert(
                    '✅ Día cerrado',
                    `Reporte ${resultado.reporte?.codigo ?? ''} creado correctamente.`,
                    [
                        {
                            text: 'Programar mañana',
                            onPress: () => router.replace({
                                pathname: '/programar-manana' as any,
                                params: {
                                    estacionId: String(estacionSeleccionadaId),
                                    proyectoId: String(proyectoId ?? ''),
                                },
                            }),
                        },
                        {
                            text: 'Ver reportes',
                            style: 'cancel',
                            onPress: () => router.replace('/(tabs)/mis-reportes' as any),
                        },
                    ]
                );
            }
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'No se pudo cerrar el día');
        } finally {
            setCerrando(false);
        }
    };

    // ============================================================
    // RENDER: Sin estación seleccionada → mostrar selector
    // ============================================================
    if (!estacionSeleccionadaId) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />
                <AppHeader variant="back" title="Cerrar día" />

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={22} color="#B45309" />
                        <Text style={styles.infoText}>
                            Seleccioná la estación en la que trabajaste hoy para cerrar el día.
                        </Text>
                    </View>

                    {cargandoEstaciones ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#B5121B" />
                        </View>
                    ) : estaciones.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
                            <Text style={styles.emptyTitle}>Sin estaciones</Text>
                            <Text style={styles.emptyText}>
                                Este proyecto no tiene estaciones configuradas.
                            </Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.sectionTitle}>Estaciones del proyecto</Text>
                            {estaciones.map((est) => (
                                <TouchableOpacity
                                    key={est.id}
                                    style={styles.stationOption}
                                    onPress={() => setEstacionSeleccionadaId(est.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.stationOptionIcon}>
                                        <Ionicons
                                            name="location"
                                            size={20}
                                            color="#B5121B"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.stationOptionCodigo}>
                                            {est.codigo}
                                        </Text>
                                        <Text
                                            style={styles.stationOptionNombre}
                                            numberOfLines={1}
                                        >
                                            {est.nombre}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={20}
                                        color="#9CA3AF"
                                    />
                                </TouchableOpacity>
                            ))}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ============================================================
    // RENDER: Con estación seleccionada → flujo completo
    // ============================================================
    const estacionActual = estaciones.find((e) => e.id === estacionSeleccionadaId);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={{ backgroundColor: '#ECEDEF', flex: 1 }}>


                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />
                <AppHeader variant="back" title="Cerrar día" />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Estación actual */}
                    <View style={styles.stationCard}>
                        <View style={styles.stationIcon}>
                            <Ionicons name="location" size={22} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.stationLabel}>Cerrando día en</Text>
                            <Text style={styles.stationName}>
                                {estacionActual?.codigo} · {estacionActual?.nombre}
                            </Text>
                        </View>
                        {estaciones.length > 1 && (
                            <TouchableOpacity
                                onPress={() => setEstacionSeleccionadaId(null)}
                                style={styles.changeStationBtn}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.changeStationText}>Cambiar</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {cargando ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#B5121B" />
                            <Text style={styles.loadingText}>Analizando el día...</Text>
                        </View>
                    ) : !resumen || (resumen.total_fotos === 0 && (resumen.total_sucesos ?? 0) === 0) ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
                            <Text style={styles.emptyTitle}>Sin registros del día</Text>
                            <Text style={styles.emptyText}>
                                No hay fotos ni sucesos registrados hoy en esta estación.
                            </Text>
                        </View>
                    ) : (


                        <>
                            {/* 👇 AQUÍ VA EL WARNING */}
                            {resumen.total_fotos === 0 && (resumen.total_sucesos ?? 0) > 0 && (
                                <View style={styles.warningBox}>
                                    <Ionicons name="warning" size={20} color="#B45309" />
                                    <Text style={styles.warningText}>
                                        Hay sucesos registrados pero no hay fotos. No se puede cerrar el día hasta que se registren fotos.
                                    </Text>
                                </View>
                            )}

                            {/* Resumen */}
                            <Text style={styles.sectionTitle}>Resumen del día</Text>

                            <View style={styles.statsRow}>
                                <StatCard
                                    icon="camera"
                                    value={resumen.total_fotos}
                                    label="Fotos"
                                    color="#B5121B"
                                />
                                <StatCard
                                    icon="list"
                                    value={resumen.total_actividades}
                                    label="Actividades"
                                    color="#2563EB"
                                />
                                <StatCard
                                    icon="warning"
                                    value={resumen.total_sucesos ?? 0}
                                    label="Sucesos"
                                    color="#D97706"
                                />
                            </View>

                            {/* Lista de actividades */}
                            <Text style={styles.sectionTitle}>Actividades del día</Text>

                            {resumen.actividades.map((act) => (
                                <View key={act.actividad_id} style={styles.actRow}>
                                    <View
                                        style={[
                                            styles.actDot,
                                            {
                                                backgroundColor: act.conforme
                                                    ? '#22C55E'
                                                    : '#F59E0B',
                                            },
                                        ]}
                                    />
                                    <Text style={styles.actName} numberOfLines={1}>
                                        {act.actividad_nombre}
                                    </Text>
                                    <Text style={styles.actFotos}>
                                        {act.total_fotos} 📸
                                    </Text>
                                </View>
                            ))}

                            {/* Observaciones */}
                            <Text style={styles.sectionTitle}>Observaciones</Text>
                            <TextInput
                                style={styles.textarea}
                                placeholder="Escribí tus observaciones del día (opcional)..."
                                placeholderTextColor="#9CA3AF"
                                value={observaciones}
                                onChangeText={setObservaciones}
                                multiline
                                textAlignVertical="top"
                            />

                            {/* Seguridad y clima */}
                            <Text style={styles.sectionTitle}>Seguridad y clima</Text>

                            <TouchableOpacity
                                style={styles.toggleRow}
                                onPress={() => setDiasConAccidentes(!diasConAccidentes)}
                                activeOpacity={0.7}
                            >
                                <View
                                    style={[
                                        styles.checkBox,
                                        diasConAccidentes && styles.checkBoxActive,
                                    ]}
                                >
                                    {diasConAccidentes && (
                                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                    )}
                                </View>
                                <Text style={styles.toggleText}>
                                    Hubo accidentes/incidentes hoy
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.toggleRow}
                                onPress={() => setDiasConLluvia(!diasConLluvia)}
                                activeOpacity={0.7}
                            >
                                <View
                                    style={[
                                        styles.checkBox,
                                        diasConLluvia && styles.checkBoxActive,
                                    ]}
                                >
                                    {diasConLluvia && (
                                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                    )}
                                </View>
                                <Text style={styles.toggleText}>Hubo lluvia hoy</Text>
                            </TouchableOpacity>
                        </>
                    )}



                </ScrollView>

                {/* Botón cerrar día */}
                {!cargando && resumen && resumen.total_fotos > 0 && (
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.closeBtn, cerrando && { opacity: 0.6 }]}
                            onPress={handleCerrarDia}
                            disabled={cerrando}
                            activeOpacity={0.85}
                        >
                            {cerrando ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                                    <Text style={styles.closeBtnText}>Cerrar día</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

            </View>
        </SafeAreaView>
    );
}

function StatCard({
    icon,
    value,
    label,
    color,
}: {
    icon: any;
    value: number;
    label: string;
    color: string;
}) {
    return (
        <View style={styles.statCard}>
            <Ionicons name={icon} size={20} color={color} />
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffffff' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 24 },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    loadingText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#6B7280',
    },

    // Info box
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#FEF3C7',
        borderLeftWidth: 4,
        borderLeftColor: '#D97706',
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
    },
    infoText: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#78350F',
        lineHeight: 18,
    },

    // Selector de estación
    stationOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 8,
    },
    stationOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stationOptionCodigo: {
        fontFamily: 'Poppins-Bold',
        fontSize: 13,
        color: '#B5121B',
    },
    stationOptionNombre: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#374151',
        marginTop: 2,
    },

    // Estación actual
    stationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#B5121B',
    },
    stationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#B5121B',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stationLabel: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#6B7280',
    },
    stationName: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
        color: '#111827',
        marginTop: 2,
    },
    changeStationBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
    },
    changeStationText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 11,
        color: '#B5121B',
    },

    sectionTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#374151',
        marginTop: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 8,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontFamily: 'Poppins-Bold',
        fontSize: 22,
    },
    statLabel: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#6B7280',
    },

    actRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 6,
    },
    actDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    actName: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#111827',
    },
    actFotos: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 11,
        color: '#6B7280',
    },

    textarea: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        minHeight: 90,
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#111827',
    },

    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 8,
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
    toggleText: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#374151',
    },

    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    closeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#B5121B',
        borderRadius: 12,
        paddingVertical: 16,
    },
    closeBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
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
    emptyText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#FEF3C7',
        borderLeftWidth: 4,
        borderLeftColor: '#D97706',
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
    },
    warningText: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#78350F',
        lineHeight: 18,
    },
});