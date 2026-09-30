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
    onIrAjustes: () => void;
};

export default function SinCacheModal({ visible, onIrAjustes }: Props) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="cloud-offline-outline" size={40} color="#B5121B" />
                    </View>

                    <Text style={styles.title}>Sin datos guardados</Text>

                    <Text style={styles.body}>
                        Para trabajar sin conexión, primero debes descargar los
                        proyectos y actividades desde la sección de Ajustes.
                    </Text>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={onIrAjustes}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Ir a Ajustes</Text>
                    </TouchableOpacity>
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
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
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
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#B5121B',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        width: '100%',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
    },
});