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

import AppBottomNav from '../../components/AppBottomNav';
import AppHeader from '../../components/AppHeader';
import CardEstacion from '../../components/CardEstacion';
import {
    ProyectoDetalle,
    proyectoService,
} from '../../lib/proyectos/proyectoService';

export default function ProyectoDetalleScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [proyecto, setProyecto] = useState<ProyectoDetalle | null>(null);
    const [cargando, setCargando] = useState(true);
    const [expandido, setExpandido] = useState(true);

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

    useFocusEffect(
        useCallback(() => {
            cargarDetalle();
        }, [cargarDetalle])
    );

    if (cargando || !proyecto) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <AppHeader />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#910E16" />
                </View>
                <AppBottomNav active="inicio" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <AppHeader />

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
                                    onCameraPress={() =>
                                        router.push({
                                            pathname: '/camera',
                                            params: { estacionId: est.id },
                                        } as any)
                                    }
                                />
                            ))
                        )}
                    </>
                )}
            </ScrollView>

            <AppBottomNav active="inicio" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ECEDEF' },
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
});