import { Ionicons } from '@expo/vector-icons';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActividadResumen } from '../../lib/actividades/ActividadContext';


type Props = {
    visible: boolean;
    actividades: ActividadResumen[];
    actualId: number | null;
    onSelect: (act: ActividadResumen) => void;
    onClose: () => void;
    onCrearNueva?: () => void;
};

const COLOR_ESTADO: Record<ActividadResumen['estado'], string> = {
    completado: '#22C55E',
    en_progreso: '#F59E0B',
    observado: '#8B5CF6',
    pendiente: '#9CA3AF',
};

export default function ActividadSelectorModal({
    visible,
    actividades,
    actualId,
    onSelect,
    onClose,
    onCrearNueva,
}: Props) {
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>

                <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>

                    <View style={styles.header}>
                        <Text style={styles.title}>Cambiar actividad</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                        {actividades.map((act) => {
                            const activa = act.id === actualId;
                            return (
                                <TouchableOpacity
                                    key={act.id}
                                    style={[
                                        styles.item,
                                        activa && styles.itemActivo,
                                    ]}
                                    onPress={() => onSelect(act)}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[
                                            styles.dot,
                                            { backgroundColor: COLOR_ESTADO[act.estado] },
                                        ]}
                                    />
                                    <Text
                                        style={[
                                            styles.itemText,
                                            activa && styles.itemTextActivo,
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {act.nombre}
                                    </Text>
                                    {activa && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={20}
                                            color="#B5121B"
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {onCrearNueva && (
                        <TouchableOpacity
                            style={styles.createBtn}
                            onPress={onCrearNueva}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#B5121B" />
                            <Text style={styles.createBtnText}>Crear nueva actividad</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '75%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    title: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        color: '#111827',
    },
    closeBtn: { padding: 4 },
    list: { maxHeight: 400 },
    listContent: { paddingVertical: 8 },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        gap: 12,
    },
    itemActivo: {
        backgroundColor: '#FEF2F2',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    itemText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: '#374151',
    },
    itemTextActivo: {
        fontFamily: 'Poppins-SemiBold',
        color: '#B5121B',
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#B5121B',
        borderStyle: 'dashed',
    },
    createBtnText: {
        color: '#B5121B',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
});