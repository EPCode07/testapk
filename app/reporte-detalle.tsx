import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
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

import AppHeader from '../components/AppHeader';
import { ReporteResumen, reporteService } from '../lib/reportes/reporteService';

const COLORES_ESTADO: Record<string, { bg: string; text: string; icon: string; label: string }> = {
    abierto: { bg: '#FEF3C7', text: '#B45309', icon: 'time-outline', label: 'Abierto' },
    revisado: { bg: '#DBEAFE', text: '#1D4ED8', icon: 'eye-outline', label: 'En revisión' },
    aprobado: { bg: '#DCFCE7', text: '#15803D', icon: 'checkmark-circle', label: 'Aprobado' },
    rechazado: { bg: '#FEE2E2', text: '#B91C1C', icon: 'alert-circle', label: 'Observado' },
};

const normalizarEstado = (estado?: string): string => {
    const e = (estado ?? '').toLowerCase().trim();
    if (e === 'en_revision' || e === 'en revision' || e === 'revisando') return 'revisado';
    if (e === 'observado' || e === 'rechazada' || e === 'observada') return 'rechazado';
    if (e === 'aprobada') return 'aprobado';
    if (e === 'abierta') return 'abierto';
    return e;
};

export default function ReporteDetalleScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ reporteId?: string }>();
    const reporteId = params.reporteId ? Number(params.reporteId) : null;

    const [reporte, setReporte] = useState<ReporteResumen | null>(null);
    const [cargando, setCargando] = useState(true);
    const [descargando, setDescargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [subsanando, setSubsanando] = useState(false);

    const cargar = useCallback(async () => {
        if (!reporteId) return;
        try {
            setError(null);
            const lista = await reporteService.listar();
            const encontrado = lista.find((r) => r.id === reporteId) ?? null;
            setReporte(encontrado);
            if (!encontrado) setError('Reporte no encontrado');
        } catch (err: any) {
            setError(err?.message ?? 'Error al cargar');
        } finally {
            setCargando(false);
        }
    }, [reporteId]);

    useFocusEffect(
        useCallback(() => {
            cargar();
        }, [cargar])
    );

    const handleDescargarPdf = async () => {
        if (!reporteId || !reporte) return;

        setDescargando(true);
        try {
            const uri = await reporteService.descargarPdf(
                reporteId,
                reporte.codigo,
                reporte.fecha,
            );

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Compartir reporte',
                    UTI: 'com.adobe.pdf',
                });
            } else {
                Alert.alert('Descargado', `Guardado en:\n${uri}`);
            }
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'No se pudo descargar el PDF');
        } finally {
            setDescargando(false);
        }
    };
    const handleResumenIA = () => {
        if (!reporteId) return;
        router.push({
            pathname: '/reporte-resumen-ia' as any,
            params: { reporteId: String(reporteId) },
        });
    };

    const handleSubsanar = () => {
        if (!reporteId || !reporte) return;

        Alert.alert(
            'Subsanar observación',
            'El reporte se reabrirá para que puedas agregar las fotos faltantes. Las actividades volverán a estar en progreso.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, subsanar',
                    onPress: async () => {
                        setSubsanando(true);
                        try {
                            await reporteService.subsanar(reporteId);
                            Alert.alert(
                                '✅ Reporte reabierto',
                                'Podés agregar las fotos faltantes desde el detalle del proyecto.',
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => router.back(),
                                    },
                                ]
                            );
                        } catch (err: any) {
                            Alert.alert('Error', err?.message ?? 'No se pudo subsanar');
                        } finally {
                            setSubsanando(false);
                        }
                    },
                },
            ]
        );
    };

    if (cargando) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />
                <AppHeader variant="back" title="Reporte" />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#B5121B" />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !reporte) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />
                <AppHeader variant="back" title="Reporte" />
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={48} color="#B91C1C" />
                    <Text style={styles.errorText}>{error ?? 'Reporte no encontrado'}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={cargar}>
                        <Ionicons name="refresh" size={16} color="#FFFFFF" />
                        <Text style={styles.retryBtnText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const estadoKey = normalizarEstado(reporte.estado);
    const config = COLORES_ESTADO[estadoKey] ?? COLORES_ESTADO.abierto;
    const esObservado = estadoKey === 'rechazado';
    const puedeResumenIA =
        estadoKey === 'abierto' ||
        estadoKey === 'revisado' ||
        estadoKey === 'aprobado';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={{ backgroundColor: '#ECEDEF', flex: 1 }}>
                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />
                <AppHeader variant="back" title={reporte.codigo} />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ESTADO */}
                    <View style={styles.statusCard}>
                        <View style={[styles.statusIcon, { backgroundColor: config.bg }]}>
                            <Ionicons name={config.icon as any} size={26} color={config.text} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statusLabel}>Estado del reporte</Text>
                            <Text style={[styles.statusValue, { color: config.text }]}>
                                {config.label}
                            </Text>
                        </View>
                    </View>

                    {/* MOTIVO DE OBSERVACIÓN */}
                    {esObservado && reporte.motivo_rechazo && (
                        <View style={styles.motivoCard}>
                            <View style={styles.motivoHeader}>
                                <Ionicons name="alert-circle" size={20} color="#991B1B" />
                                <Text style={styles.motivoTitle}>Motivo de la observación</Text>
                            </View>
                            <Text style={styles.motivoTexto}>{reporte.motivo_rechazo}</Text>
                            <Text style={styles.motivoHint}>
                                Coordiná con el supervisor para resolver la observación.
                            </Text>
                        </View>
                    )}

                    {/* INFO PRINCIPAL */}
                    <Text style={styles.sectionTitle}>Información general</Text>

                    <View style={styles.infoCard}>
                        <InfoRow
                            icon="calendar-outline"
                            label="Fecha"
                            value={new Date(reporte.fecha).toLocaleDateString('es-PE', {
                                weekday: 'long',
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                            })}
                        />
                        <InfoRow
                            icon="location-outline"
                            label="Estación"
                            value={reporte.estacion_codigo ?? '—'}
                        />
                        <InfoRow
                            icon="camera-outline"
                            label="Total fotos"
                            value={`${reporte.total_fotos} foto${reporte.total_fotos !== 1 ? 's' : ''}`}
                        />
                        {reporte.creado_en && (
                            <InfoRow
                                icon="time-outline"
                                label="Creado"
                                value={new Date(reporte.creado_en).toLocaleString('es-PE', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            />
                        )}
                        {reporte.revisado_en && (
                            <InfoRow
                                icon="eye-outline"
                                label="Revisado"
                                value={new Date(reporte.revisado_en).toLocaleString('es-PE', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            />
                        )}
                        {reporte.aprobado_en && (
                            <InfoRow
                                icon="checkmark-circle-outline"
                                label="Aprobado"
                                value={new Date(reporte.aprobado_en).toLocaleString('es-PE', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            />
                        )}
                    </View>

                    {/* RESUMEN EJECUTIVO */}
                    {reporte.resumen_ejecutivo && (
                        <>
                            <Text style={styles.sectionTitle}>Resumen ejecutivo</Text>
                            <View style={styles.resumenCard}>
                                <ScrollView
                                    style={styles.resumenScroll}
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    <Text style={styles.resumenTexto}>
                                        {reporte.resumen_ejecutivo}
                                    </Text>
                                </ScrollView>
                            </View>
                        </>
                    )}

                    {/* ACCIONES */}
                    <Text style={styles.sectionTitle}>Acciones</Text>
                    {reporte.estado === 'rechazado' && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnDanger, subsanando && { opacity: 0.6 }]}
                            onPress={handleSubsanar}
                            disabled={subsanando}
                            activeOpacity={0.85}
                        >
                            {subsanando ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                                    <Text style={styles.actionBtnDangerText}>
                                        Subsanar observación
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnPrimary]}
                        onPress={handleDescargarPdf}
                        disabled={descargando}
                        activeOpacity={0.85}
                    >
                        {descargando ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                                <Text style={styles.actionBtnPrimaryText}>
                                    Descargar y compartir PDF
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {puedeResumenIA && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnWarning]}
                            onPress={handleResumenIA}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                            <Text style={styles.actionBtnWarningText}>
                                {reporte.resumen_ejecutivo ? 'Editar resumen con IA' : 'Generar resumen con IA'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

function InfoRow({
    icon,
    label,
    value,
}: {
    icon: any;
    label: string;
    value: string;
}) {
    return (
        <View style={styles.infoRow}>
            <Ionicons name={icon} size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffffff' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32 },

    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 32,
    },
    errorText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#B91C1C',
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
    },
    retryBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },

    // STATUS
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
    },
    statusIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusLabel: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#6B7280',
    },
    statusValue: {
        fontFamily: 'Poppins-Bold',
        fontSize: 17,
        marginTop: 2,
    },

    // MOTIVO
    motivoCard: {
        backgroundColor: '#FEE2E2',
        borderLeftWidth: 4,
        borderLeftColor: '#B91C1C',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    motivoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    motivoTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 13,
        color: '#991B1B',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    motivoTexto: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#7F1D1D',
        lineHeight: 19,
    },
    motivoHint: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#991B1B',
        marginTop: 8,
        fontStyle: 'italic',
    },

    // SECTIONS
    sectionTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 16,
        marginBottom: 8,
        marginLeft: 4,
    },

    // INFO
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    infoLabel: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#6B7280',
        width: 90,
    },
    infoValue: {
        flex: 1,
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#111827',
        textAlign: 'right',
        textTransform: 'capitalize',
    },

    // RESUMEN
    resumenCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
    },
    resumenScroll: {
        maxHeight: 220,
    },
    resumenTexto: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#374151',
        lineHeight: 20,
        textAlign: 'justify',
    },

    // ACTIONS
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 10,
    },
    actionBtnPrimary: { backgroundColor: '#B5121B' },
    actionBtnPrimaryText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
    actionBtnWarning: { backgroundColor: '#D97706' },
    actionBtnWarningText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
    actionBtnDanger: { backgroundColor: '#D97706' },
    actionBtnDangerText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
});