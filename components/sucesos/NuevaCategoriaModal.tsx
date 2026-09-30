import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSucesos } from '../../lib/sucesos/SucesosContext';
import { SucesoCategoria, TipoSuceso } from '../../lib/sucesos/types';

type Props = {
    visible: boolean;
    onClose: () => void;
    onCreada: (cat: SucesoCategoria) => void;
};

export default function NuevaCategoriaModal({ visible, onClose, onCreada }: Props) {
    const insets = useSafeAreaInsets();
    const { crearCategoria } = useSucesos();

    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState<TipoSuceso>('condicion_climatica');
    const [unidad, setUnidad] = useState('');
    const [guardando, setGuardando] = useState(false);

    const resetear = () => {
        setNombre('');
        setTipo('condicion_climatica');
        setUnidad('');
    };

    const handleCrear = async () => {
        if (!nombre.trim()) {
            Alert.alert('Falta nombre', 'Escribí un nombre para la categoría.');
            return;
        }

        setGuardando(true);
        try {
            const cat = await crearCategoria({
                nombre: nombre.trim(),
                tipo,
                unidad: unidad.trim() || undefined,
            });
            onCreada(cat);
            resetear();
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'No se pudo crear');
        } finally {
            setGuardando(false);
        }
    };

    const handleCerrar = () => {
        if (guardando) return;
        resetear();
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCerrar}>
            <View style={styles.backdrop}>
                <View style={[styles.card, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Nueva categoría</Text>
                        <TouchableOpacity onPress={handleCerrar} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body}>
                        <Text style={styles.label}>Nombre *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Inundación, Derrumbe, Alud..."
                            placeholderTextColor="#9CA3AF"
                            value={nombre}
                            onChangeText={setNombre}
                            autoFocus
                        />

                        <Text style={styles.label}>Tipo *</Text>
                        <TouchableOpacity
                            style={[styles.tipoBtn, tipo === 'seguridad_ambiente' && styles.tipoBtnActivo]}
                            onPress={() => setTipo('seguridad_ambiente')}
                        >
                            <Ionicons
                                name="shield-outline"
                                size={18}
                                color={tipo === 'seguridad_ambiente' ? '#B5121B' : '#6B7280'}
                            />
                            <Text
                                style={[
                                    styles.tipoBtnText,
                                    tipo === 'seguridad_ambiente' && styles.tipoBtnTextActivo,
                                ]}
                            >
                                Seguridad y ambiente
                            </Text>
                            {tipo === 'seguridad_ambiente' && (
                                <Ionicons name="checkmark-circle" size={20} color="#B5121B" />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tipoBtn, tipo === 'condicion_climatica' && styles.tipoBtnActivo]}
                            onPress={() => setTipo('condicion_climatica')}
                        >
                            <Ionicons
                                name="cloud-outline"
                                size={18}
                                color={tipo === 'condicion_climatica' ? '#B5121B' : '#6B7280'}
                            />
                            <Text
                                style={[
                                    styles.tipoBtnText,
                                    tipo === 'condicion_climatica' && styles.tipoBtnTextActivo,
                                ]}
                            >
                                Condición climática
                            </Text>
                            {tipo === 'condicion_climatica' && (
                                <Ionicons name="checkmark-circle" size={20} color="#B5121B" />
                            )}
                        </TouchableOpacity>

                        <Text style={styles.label}>Unidad (opcional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: mm, cm, km/h, unidades..."
                            placeholderTextColor="#9CA3AF"
                            value={unidad}
                            onChangeText={setUnidad}
                        />

                        <View style={styles.hintBox}>
                            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                            <Text style={styles.hintText}>
                                La categoría estará disponible para todos. Un admin la revisará después.
                            </Text>
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.saveBtn, guardando && { opacity: 0.6 }]}
                        onPress={handleCrear}
                        disabled={guardando}
                    >
                        {guardando ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                                <Text style={styles.saveBtnText}>Crear y usar</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 20,
        width: '100%',
        maxWidth: 460,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        color: '#111827',
    },
    closeBtn: { padding: 4 },
    body: { maxHeight: 400 },
    label: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        color: '#374151',
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#111827',
    },
    tipoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        marginBottom: 8,
    },
    tipoBtnActivo: {
        borderColor: '#B5121B',
        backgroundColor: '#FEF2F2',
    },
    tipoBtnText: {
        flex: 1,
        fontFamily: 'Poppins-Medium',
        fontSize: 13,
        color: '#374151',
    },
    tipoBtnTextActivo: {
        fontFamily: 'Poppins-SemiBold',
        color: '#B5121B',
    },
    hintBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 10,
        marginTop: 16,
    },
    hintText: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#6B7280',
        lineHeight: 16,
    },
    saveBtn: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: '#B5121B',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
});