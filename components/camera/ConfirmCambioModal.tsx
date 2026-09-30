import { Ionicons } from '@expo/vector-icons';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Props = {
    visible: boolean;
    cantidadFotos: number;
    actividadActualNombre: string;
    actividadNuevaNombre: string;
    onReasignar: () => void;
    onExportarYCambiar: () => void;
    onCancelar: () => void;
};

export default function ConfirmCambioModal({
    visible,
    cantidadFotos,
    actividadActualNombre,
    actividadNuevaNombre,
    onReasignar,
    onExportarYCambiar,
    onCancelar,
}: Props) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancelar}
        >
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.title}>
                        Cambiar a "{actividadNuevaNombre}"
                    </Text>
                    <Text style={styles.body}>
                        Tienes {cantidadFotos} foto{cantidadFotos > 1 ? 's' : ''} sin
                        exportar de "{actividadActualNombre}". ¿Qué querés hacer?
                    </Text>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnSecondary]}
                            onPress={onReasignar}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="swap-horizontal" size={18} color="#B5121B" />
                            <Text style={styles.btnSecondaryText}>
                                Reasignar a la nueva actividad
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.btnPrimary]}
                            onPress={onExportarYCambiar}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.btnPrimaryText}>
                                Exportar y cambiar
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.btnGhost]}
                            onPress={onCancelar}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.btnGhostText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 420,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        color: '#111827',
        marginBottom: 10,
    },
    body: {
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        color: '#4B5563',
        lineHeight: 20,
        marginBottom: 20,
    },
    actions: { gap: 10 },
    btn: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnPrimary: { backgroundColor: '#B5121B' },
    btnPrimaryText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
    btnSecondary: {
        borderWidth: 1.5,
        borderColor: '#B5121B',
    },
    btnSecondaryText: {
        color: '#B5121B',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
    btnGhost: { paddingVertical: 10 },
    btnGhostText: {
        color: '#6B7280',
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
    },
});