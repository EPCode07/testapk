import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useActividad } from '@/lib/actividades/ActividadContext';
import AppBottomNav from '../../components/AppBottomNav';
import AppHeader from '../../components/AppHeader';
import ConfirmarReaperturaModal from '../../components/camera/ConfirmarReaperturaModal';
import CardEstacion from '../../components/CardEstacion';
import {
    ProyectoDetalle,
    proyectoService,
} from '../../lib/proyectos/proyectoService';
import { reporteService } from '../../lib/reportes/reporteService';
import { useSync } from '../../lib/sync/SyncContext';

export default function ProyectoDetalleScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [proyecto, setProyecto] = useState<ProyectoDetalle | null>(null);
    const [cargando, setCargando] = useState(true);
    const [expandido, setExpandido] = useState(true);
    const { isOnline } = useSync();
    const [reporteRechazado, setReporteRechazado] = useState<any>(null);

    const { seed, estacionId: estacionIdContext } = useActividad();

    const cargarDetalle = useCallback(async () => {
        try {
            const data = await proyectoService.detalle(parseInt(id));
            setProyecto(data);
        } catch (error: any) {
            showMessage({
                message: error.message ?? 'Error al cargar el proyecto',
                type: 'danger',
                icon: 'danger',
            });
        } finally {
            setCargando(false);
        }
    }, [id]);

    const [reaperturaVisible, setReaperturaVisible] = useState(false);
    const [actividadPendiente, setActividadPendiente] = useState<{
        id: number;
        nombre: string;
        estado: string;
    } | null>(null);

    const abrirActividad = (
        estacionId: number,
        estacionCodigo: string,
        estacionServicios: any[],
        actividadId: number,
        actividadNombre: string
    ) => {
        seed({
            proyectoId: proyecto!.id,
            proyectoNombre: proyecto!.nombre,
            estacionId,
            estacionCodigo,
            actividades: estacionServicios.flatMap((s) =>
                s.actividades.map((a: any) => ({
                    id: a.id,
                    nombre: a.nombre,
                    tipo: a.tipo,
                    estado: a.estado,
                    conforme: a.conforme,
                }))
            ),
            actividadActualId: actividadId,
        });

        router.push({
            pathname: '/camera',
            params: {
                estacion_servicio_actividad_id: String(actividadId),
            },
        } as any);
    };

    useFocusEffect(
        useCallback(() => {
            cargarDetalle();
        }, [cargarDetalle])
    );


    useFocusEffect(
        useCallback(() => {
            cargarDetalle();
            // 🔑 Buscar si hay un reporte rechazado para la estación actual
            if (estacionIdContext) {
                reporteService.listar()
                    .then((lista) => {
                        const hoy = new Date().toISOString().slice(0, 10);
                        const rechazado = lista.find(
                            (r) =>
                                r.estacion_id === estacionIdContext &&
                                r.estado === 'rechazado'
                        );
                        setReporteRechazado(rechazado ?? null);
                    })
                    .catch(() => setReporteRechazado(null));
            }
        }, [cargarDetalle, estacionIdContext])
    );

    if (cargando || !proyecto) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />
                <AppHeader variant="back" title="Actividades" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#910E16" />
                </View>

                <AppBottomNav active="inicio" />


            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>

            <View style={{ backgroundColor: '#ECEDEF', flex: 1 }}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

                <AppHeader variant="back" title="Actividades" />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* CARD DEL PROYECTO */}
                    <View style={styles.proyectoCard}>
                        <TouchableOpacity
                            style={styles.proyectoHeader}
                            onPress={() => setExpandido((v) => !v)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.proyectoHeaderLeft}>
                                <View style={styles.dotRojo} />
                                <Text style={styles.proyectoNombre} numberOfLines={1}>
                                    {proyecto.nombre}
                                </Text>
                            </View>
                            <Ionicons
                                name={expandido ? 'chevron-up' : 'chevron-down'}
                                size={22}
                                color="#111827"
                            />
                        </TouchableOpacity>

                        <Text style={styles.progresoTexto}>
                            {proyecto.progreso}% Completado
                        </Text>

                        <View style={styles.progresoBarra}>
                            <View
                                style={[
                                    styles.progresoRelleno,
                                    { width: `${proyecto.progreso}%` },
                                ]}
                            />
                        </View>
                    </View>

                    {/* ESTACIONES */}
                    {expandido && (
                        <>
                            {!proyecto.estaciones || proyecto.estaciones.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyIcon}>📭</Text>
                                    <Text style={styles.emptyText}>Sin estaciones</Text>
                                    <Text style={styles.emptySubtext}>
                                        Este proyecto todavía no tiene estaciones configuradas
                                    </Text>
                                </View>
                            ) : (

                                proyecto.estaciones.map((est) => (
                                    <CardEstacion
                                        key={est.id}
                                        estacion={est}
                                        onActividadPress={(actividadId, actividadNombre, estado) => {
                                            if (estado === 'completado') {
                                                // Abrir modal de confirmación
                                                setActividadPendiente({
                                                    id: actividadId,
                                                    nombre: actividadNombre,
                                                    estado,
                                                });
                                                setReaperturaVisible(true);
                                                // Guardar contexto para reusar
                                                (global as any).__pendingEstacion = {
                                                    id: est.id,
                                                    codigo: est.codigo,
                                                    servicios: est.servicios,
                                                };
                                            } else {
                                                // Flujo normal
                                                abrirActividad(
                                                    est.id,
                                                    est.codigo,
                                                    est.servicios,
                                                    actividadId,
                                                    actividadNombre
                                                );
                                            }
                                        }}
                                    />
                                ))

                            )
                            }
                        </>
                    )}

                    <ConfirmarReaperturaModal
                        visible={reaperturaVisible && actividadPendiente !== null}
                        nombreActividad={actividadPendiente?.nombre ?? ''}
                        fechaCompletada={null} // Si tienes la fecha, pásala aquí
                        onVerFotos={() => {
                            setReaperturaVisible(false);
                            if (!actividadPendiente) return;
                            const ctx = (global as any).__pendingEstacion;
                            if (!ctx) return;

                            // Sembrar context y abrir el álbum directamente
                            seed({
                                proyectoId: proyecto!.id,
                                proyectoNombre: proyecto!.nombre,
                                estacionId: ctx.id,
                                estacionCodigo: ctx.codigo,
                                actividades: ctx.servicios.flatMap((s: any) =>
                                    s.actividades.map((a: any) => ({
                                        id: a.id,
                                        nombre: a.nombre,
                                        tipo: a.tipo,
                                        estado: a.estado,
                                        conforme: a.conforme,
                                    }))
                                ),
                                actividadActualId: actividadPendiente.id,
                            });

                            router.push('/photo-album' as any);
                            setActividadPendiente(null);
                        }}
                        onAgregarRegistro={() => {
                            setReaperturaVisible(false);
                            if (!actividadPendiente) return;
                            const ctx = (global as any).__pendingEstacion;
                            if (!ctx) return;

                            abrirActividad(
                                ctx.id,
                                ctx.codigo,
                                ctx.servicios,
                                actividadPendiente.id,
                                actividadPendiente.nombre
                            );
                            setActividadPendiente(null);
                        }}
                        onCancelar={() => {
                            setReaperturaVisible(false);
                            setActividadPendiente(null);
                        }}
                    />
                </ScrollView>

                <AppBottomNav active="inicio" />

            </View>
            {/* FAB: Cerrar Día (fuera del View interior para que quede encima) */}
            <TouchableOpacity
                style={[
                    styles.fabCerrarDia,
                    reporteRechazado && styles.fabCorregir,
                ]}
                onPress={() =>
                    router.push({
                        pathname: '/cerrar-dia' as any,
                        params: {
                            proyectoId: String(proyecto.id),
                            estacionId: estacionIdContext ? String(estacionIdContext) : undefined,
                            reporteId: reporteRechazado ? String(reporteRechazado.id) : undefined,
                        },
                    })
                }
                activeOpacity={0.9}
            >
                <Ionicons
                    name={reporteRechazado ? 'construct-outline' : 'checkmark-done'}
                    size={22}
                    color="#FFFFFF"
                />
                <Text style={styles.fabCerrarDiaText}>
                    {reporteRechazado ? 'Agregar correcciones' : 'Cerrar día'}
                </Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffffff' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
    },

    // Card del proyecto
    proyectoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 14,
    },
    proyectoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    proyectoHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    dotRojo: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#910E16',
    },
    proyectoNombre: {
        color: '#910E16',
        fontFamily: 'Poppins-Bold',
        fontSize: 17,
        flex: 1,
    },
    progresoTexto: {
        color: '#6B7280',
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        marginBottom: 8,
    },
    progresoBarra: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 9999,
        overflow: 'hidden',
    },
    progresoRelleno: {
        height: '100%',
        backgroundColor: '#910E16',
        borderRadius: 9999,
    },

    // Empty
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyIcon: { fontSize: 48, marginBottom: 8 },
    emptyText: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        color: '#374151',
    },
    emptySubtext: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 4,
        textAlign: 'center',
        fontFamily: 'Poppins-Regular',
    },

    fabCerrarDia: {
        position: 'absolute',
        bottom: 94,                  // arriba del bottom nav
        right: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#B5121B',
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        zIndex: 999,
    },
    fabCerrarDiaText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
    fabCorregir: {
        backgroundColor: '#D97706',
    },
});