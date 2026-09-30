import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../../components/AppHeader';
import { ReporteResumen, reporteService } from '../../lib/reportes/reporteService';

const COLORES_ESTADO: Record<string, { bg: string; text: string; icon: string; label: string }> = {
    abierto: {
        bg: '#FEF3C7',
        text: '#B45309',
        icon: 'time-outline',
        label: 'Abierto',
    },
    revisado: {
        bg: '#DBEAFE',
        text: '#1D4ED8',
        icon: 'eye-outline',
        label: 'En revisión',
    },
    aprobado: {
        bg: '#DCFCE7',
        text: '#15803D',
        icon: 'checkmark-circle',
        label: 'Aprobado',
    },
    rechazado: {
        bg: '#FEE2E2',
        text: '#B91C1C',
        icon: 'alert-circle',
        label: 'Observado',
    },
};

const normalizarEstado = (estado?: string): string => {
    const e = (estado ?? '').toLowerCase().trim();
    if (e === 'en_revision' || e === 'en revision' || e === 'revisando') return 'revisado';
    if (e === 'observado' || e === 'rechazada' || e === 'observada') return 'rechazado';
    if (e === 'aprobada') return 'aprobado';
    if (e === 'abierta') return 'abierto';
    return e;
};

export default function MisReportesScreen() {
    const router = useRouter();
    const [reportes, setReportes] = useState<ReporteResumen[]>([]);
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const primeraCargaRef = useRef(true);
    const ultimaCargaRef = useRef<number>(0);

    const cargar = useCallback(async () => {
        try {
            setError(null);
            const data = await reporteService.listar();
            setReportes(data);
            ultimaCargaRef.current = Date.now();
        } catch (err: any) {
            setError(err?.message ?? 'No se pudieron cargar los reportes');
        } finally {
            setCargando(false);
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefrescando(true);
        try {
            setError(null);
            const data = await reporteService.listar();
            setReportes(data);
            ultimaCargaRef.current = Date.now();
        } catch (err: any) {
            setError(err?.message ?? 'No se pudieron cargar los reportes');
        } finally {
            setRefrescando(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            const ahora = Date.now();
            const msDesdeUltima = ahora - ultimaCargaRef.current;

            // 🔑 Recargar solo si:
            // - Es la primera vez (siempre carga)
            // - O pasaron más de 60 segundos desde la última carga
            if (primeraCargaRef.current || msDesdeUltima > 60_000) {
                cargar();
                primeraCargaRef.current = false;
            }
        }, [cargar])
    );
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={{ backgroundColor: '#ECEDEF', flex: 1 }}>


                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />

                <AppHeader />

                {cargando ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#B5121B" />
                        <Text style={styles.loadingText}>Cargando reportes...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.center}>
                        <Ionicons name="alert-circle-outline" size={48} color="#B91C1C" />
                        <Text style={styles.errorTitle}>Error al cargar</Text>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={cargar}>
                            <Ionicons name="refresh" size={16} color="#FFFFFF" />
                            <Text style={styles.retryBtnText}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : reportes.length === 0 ? (
                    <View style={styles.center}>
                        <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
                        <Text style={styles.emptyTitle}>Sin reportes</Text>
                        <Text style={styles.emptyText}>
                            Todavía no cerraste ningún día. Cuando lo hagas, aparecerán acá.
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refrescando}
                                onRefresh={onRefresh}
                                colors={['#B5121B']}
                                tintColor="#B5121B"
                            />
                        }
                    >
                        {reportes.map((rep) => {
                            const estadoKey = normalizarEstado(rep.estado);
                            const config = COLORES_ESTADO[estadoKey] ?? COLORES_ESTADO.abierto;
                            const esObservado = estadoKey === 'rechazado';

                            return (
                                <TouchableOpacity
                                    key={rep.id}
                                    style={styles.card}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                        router.push({
                                            pathname: '/reporte-detalle' as any,
                                            params: { reporteId: String(rep.id) },
                                        })
                                    }
                                >
                                    {/* Header */}
                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardHeaderLeft}>
                                            <Text style={styles.cardCodigo}>
                                                {rep.codigo}
                                            </Text>
                                            <Text style={styles.cardFecha}>
                                                📅{' '}
                                                {new Date(rep.fecha).toLocaleDateString('es-PE', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </Text>
                                        </View>

                                        <View
                                            style={[
                                                styles.badge,
                                                { backgroundColor: config.bg },
                                            ]}
                                        >
                                            <Ionicons
                                                name={config.icon as any}
                                                size={12}
                                                color={config.text}
                                            />
                                            <Text
                                                style={[
                                                    styles.badgeText,
                                                    { color: config.text },
                                                ]}
                                            >
                                                {config.label}
                                            </Text>
                                        </View>
                                        <View style={styles.cardArrow}>
                                            <Ionicons
                                                name="chevron-forward"
                                                size={20}
                                                color="#9CA3AF"
                                            />
                                        </View>
                                    </View>

                                    {/* Info */}
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardInfoText}>
                                            🏢 {rep.estacion_codigo}
                                        </Text>
                                        <Text style={styles.cardInfoText}>
                                            📸 {rep.total_fotos} foto{rep.total_fotos !== 1 ? 's' : ''}
                                        </Text>
                                    </View>

                                    {/* Motivo rechazo */}
                                    {esObservado && rep.motivo_rechazo && (
                                        <View style={styles.motivoBox}>
                                            <Ionicons
                                                name="alert-circle"
                                                size={14}
                                                color="#991B1B"
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.motivoTitle}>
                                                    Motivo de la observación
                                                </Text>
                                                <Text style={styles.motivoTexto}>
                                                    {rep.motivo_rechazo}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {/* Arrow */}

                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffffff' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 24 },

    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        gap: 12,
    },
    loadingText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#6B7280',
    },
    errorTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
        color: '#B91C1C',
        marginTop: 8,
    },
    errorText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#B5121B',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 8,
    },
    retryBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
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
        lineHeight: 18,
    },

    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        position: 'relative',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    cardHeaderLeft: {
        flex: 1,
        gap: 2,
    },
    cardCodigo: {
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
        color: '#111827',
    },
    cardFecha: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#6B7280',
    },
    badge: {
        flexDirection: 'row',
        marginRight: 16,
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    badgeText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 10,
        letterSpacing: 0.2,
    },

    cardInfo: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 4,
    },
    cardInfoText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#4B5563',
    },

    motivoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
        padding: 10,
        marginTop: 10,
    },
    motivoTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 10,
        color: '#991B1B',
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    motivoTexto: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#7F1D1D',
        lineHeight: 16,
    },

    cardArrow: {
        position: 'absolute',
        right: -11,
        top: '50%',
        marginTop: -10,
    },
});