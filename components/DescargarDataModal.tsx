import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    descargarTodo,
    PasoDescarga,
    ProgresoDescarga,
} from '../lib/proyectos/descargaService';
import type { CacheMetadata } from '../lib/proyectos/proyectoCache';

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
};

const PROGRESO_INICIAL: ProgresoDescarga = {
    pasos: [],
    porcentaje: 0,
    completado: false,
    error: null,
};

export default function DescargarDataModal({ visible, onClose, onSuccess }: Props) {
    const insets = useSafeAreaInsets();

    const [progreso, setProgreso] = useState<ProgresoDescarga>(PROGRESO_INICIAL);
    const [finalizado, setFinalizado] = useState(false);
    const [meta, setMeta] = useState<CacheMetadata | null>(null);

    // ... resto del componente sin cambios

    const iniciarDescarga = async () => {
        setFinalizado(false);
        setMeta(null);
        setProgreso(PROGRESO_INICIAL);

        try {
            const resultado = await descargarTodo(setProgreso);
            setFinalizado(true);
            if (resultado.success && resultado.meta) {
                setMeta(resultado.meta);
                onSuccess?.();
            } else if (!resultado.success) {
                setProgreso((p) => ({
                    ...p,
                    error: resultado.error ?? 'Error en la descarga',
                }));
            }
        } catch (err: any) {
            setFinalizado(true);
            setProgreso((p) => ({
                ...p,
                error: err?.message ?? 'Error desconocido',
            }));
        }
    };

    useEffect(() => {
        if (!visible) return;

        let cancelado = false;

        (async () => {
            setFinalizado(false);
            setMeta(null);
            setProgreso(PROGRESO_INICIAL);

            try {
                const resultado = await descargarTodo(setProgreso);
                if (cancelado) return;

                setFinalizado(true);
                if (resultado.success && resultado.meta) {
                    setMeta(resultado.meta);
                    onSuccess?.();
                }
            } catch (err: any) {
                if (cancelado) return;
                setFinalizado(true);
                setProgreso((p) => ({
                    ...p,
                    error: err?.message ?? 'Error desconocido',
                }));
            }
        })();

        return () => {
            cancelado = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const huboError = progreso.error !== null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={finalizado ? onClose : undefined}
        >
            <View style={styles.backdrop}>
                <View style={[styles.card, { paddingBottom: insets.bottom + 20 }]}>
                    {!finalizado ? (
                        <Text style={styles.title}>Descargando datos</Text>
                    ) : huboError ? (
                        <Text style={[styles.title, { color: '#C62828' }]}>
                            Error en la descarga
                        </Text>
                    ) : (
                        <Text style={[styles.title, { color: '#2E7D32' }]}>
                            Sincronización completada
                        </Text>
                    )}

                    <View style={styles.pasosWrapper}>
                        {progreso.pasos.map((paso) => (
                            <PasoRow key={paso.id} paso={paso} />
                        ))}
                    </View>

                    {!finalizado && (
                        <View style={styles.progressWrapper}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${progreso.porcentaje}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>{progreso.porcentaje}%</Text>
                        </View>
                    )}

                    {huboError && finalizado && (
                        <Text style={styles.errorText}>{progreso.error}</Text>
                    )}

                    {finalizado && !huboError && meta && (
                        <View style={styles.resumenWrapper}>
                            <Text style={styles.resumenValores}>
                                {meta.totalProyectos} proyectos ·{' '}
                                {meta.totalEstaciones} estaciones ·{' '}
                                {meta.totalActividades} actividades
                                {meta.totalSupervisores != null
                                    ? ` · ${meta.totalSupervisores} supervisores`
                                    : ''}
                            </Text>
                            <Text style={styles.resumenHint}>
                                Ya puedes trabajar sin conexión.
                            </Text>
                        </View>
                    )}

                    {finalizado && (
                        <View style={styles.buttonRow}>
                            {huboError && (
                                <TouchableOpacity
                                    style={[styles.button, styles.buttonSecondary]}
                                    onPress={iniciarDescarga}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.buttonTextSecondary}>Reintentar</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.button}
                                onPress={onClose}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.buttonText}>Aceptar</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

function PasoRow({ paso }: { paso: PasoDescarga }) {
    return (
        <View style={styles.pasoRow}>
            <View style={styles.pasoIcon}>
                {paso.estado === 'pendiente' && <View style={styles.circlePendiente} />}
                {paso.estado === 'en_progreso' && (
                    <ActivityIndicator size="small" color="#7A1C1C" />
                )}
                {paso.estado === 'completado' && (
                    <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
                )}
                {paso.estado === 'error' && (
                    <Ionicons name="close-circle" size={22} color="#C62828" />
                )}
            </View>

            <View style={styles.pasoText}>
                <Text
                    style={[
                        styles.pasoLabel,
                        paso.estado === 'completado' && styles.pasoLabelCompletado,
                        paso.estado === 'error' && { color: '#C62828' },
                    ]}
                >
                    {paso.icono} {paso.label}
                </Text>
                {paso.detalle && (
                    <Text style={styles.pasoDetalle}>
                        {paso.detalle}
                        {paso.cantidad != null && paso.estado === 'completado'
                            ? ` · ${paso.cantidad}`
                            : ''}
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#ffffffff',
        borderRadius: 20,
        padding: 18,
        width: '100%',
        maxWidth: 460,
    },
    title: {
        fontSize: 18,
        color: '#7A1C1C',
        textAlign: 'center',
        marginBottom: 16,
        fontFamily: 'Poppins-Bold',
    },
    pasosWrapper: { marginBottom: 16 },
    pasoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    pasoIcon: {
        width: 40,
        height: 40,
        backgroundColor: '#ffffffff',
        borderRadius: 8,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circlePendiente: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#D1D5DB',
    },
    pasoText: { flex: 1 },
    pasoLabel: {
        fontSize: 10,
        fontFamily: 'Poppins-Regular',
        color: '#888888',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    pasoLabelCompletado: { color: '#222222' },
    pasoDetalle: {
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
        color: '#222222',
        marginTop: 2,
    },
    progressWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 2,
    },
    progressBar: {
        flex: 1,
        height: 10,
        backgroundColor: '#D0D4D7',
        borderRadius: 9999,
        overflow: 'hidden',
        marginRight: 10,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#7A1C1C',
        borderRadius: 9999,
    },
    progressText: {
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
        color: '#7A1C1C',
        minWidth: 44,
        textAlign: 'right',
    },
    errorText: {
        fontSize: 13,
        color: '#C62828',
        textAlign: 'center',
        marginBottom: 16,
    },
    resumenWrapper: {
        backgroundColor: '#C8CDD0',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        alignItems: 'center',
    },
    resumenValores: {
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
        color: '#222222',
        textAlign: 'center',
    },
    resumenHint: {
        fontSize: 11,
        color: '#2E7D32',
        marginTop: 8,
        fontFamily: 'Poppins-SemiBold',
    },
    buttonRow: { flexDirection: 'row', gap: 10 },
    button: {
        flex: 1,
        backgroundColor: '#7A1C1C',
        borderRadius: 20,
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonSecondary: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#7A1C1C',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontFamily: 'Poppins-SemiBold',
    },
    buttonTextSecondary: {
        color: '#7A1C1C',
        fontSize: 15,
        fontFamily: 'Poppins-SemiBold',
    },
});