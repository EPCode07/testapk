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
    nombreActividad: string;
    fechaCompletada?: string | null;
    onVerFotos: () => void;
    onAgregarRegistro: () => void;
    onCancelar: () => void;
};

export default function ConfirmarReaperturaModal({
    visible,
    nombreActividad,
    fechaCompletada,
    onVerFotos,
    onAgregarRegistro,
    onCancelar,
}: Props) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="checkmark-done-circle" size={42} color="#2E7D32" />
                    </View>

                    <Text style={styles.title}>Actividad completada</Text>

                    <Text style={styles.body}>
                        <Text style={styles.bold}>"{nombreActividad}"</Text> ya fue completada
                        {fechaCompletada ? ` el ${fechaCompletada}` : ''}.
                        {'\n\n'}
                        ¿Qué querés hacer?
                    </Text>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnSecondary]}
                            onPress={onVerFotos}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="images-outline" size={18} color="#B5121B" />
                            <Text style={styles.btnSecondaryText}>Ver fotos</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.btnPrimary]}
                            onPress={onAgregarRegistro}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.btnPrimaryText}>Agregar nuevo registro</Text>
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
        borderRadius: 18,
        padding: 24,
        width: '100%',
        maxWidth: 420,
        alignItems: 'center',
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: 17,
        fontFamily: 'Poppins-Bold',
        color: '#111827',
        marginBottom: 10,
    },
    body: {
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    bold: {
        fontFamily: 'Poppins-SemiBold',
        color: '#111827',
    },
    actions: {
        width: '100%',
        gap: 10,
    },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
    },
    btnPrimary: {
        backgroundColor: '#B5121B',
    },
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
    btnGhost: {
        paddingVertical: 10,
    },
    btnGhostText: {
        color: '#6B7280',
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
    },
});