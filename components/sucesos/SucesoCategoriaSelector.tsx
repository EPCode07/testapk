import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SucesoCategoria } from '../../lib/sucesos/types';

type Props = {
    visible: boolean;
    categorias: SucesoCategoria[];
    seleccionadaId: number | null;
    onSelect: (cat: SucesoCategoria) => void;
    onCerrar: () => void;
    onCrearNueva: () => void;
};

export default function SucesoCategoriaSelector({
    visible,
    categorias,
    seleccionadaId,
    onSelect,
    onCerrar,
    onCrearNueva,
}: Props) {
    const insets = useSafeAreaInsets();
    const [busqueda, setBusqueda] = useState('');

    const filtradas = useMemo(() => {
        if (!busqueda.trim()) return categorias;
        const q = busqueda.toLowerCase().trim();
        return categorias.filter((c) => c.nombre.toLowerCase().includes(q));
    }, [categorias, busqueda]);

    const seguridad = filtradas.filter((c) => c.tipo === 'seguridad_ambiente');
    const clima = filtradas.filter((c) => c.tipo === 'condicion_climatica');

    const renderSeccion = (titulo: string, items: SucesoCategoria[], icono: string) => {
        if (items.length === 0) return null;
        return (
            <>
                <View style={styles.seccionHeader}>
                    <Ionicons name={icono as any} size={14} color="#6B7280" />
                    <Text style={styles.seccionTitulo}>{titulo}</Text>
                </View>
                {items.map((cat) => {
                    const activa = cat.id === seleccionadaId;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.item, activa && styles.itemActivo]}
                            onPress={() => {
                                onSelect(cat);
                                setBusqueda('');
                            }}
                            activeOpacity={0.7}
                        >
                            <View
                                style={[
                                    styles.colorDot,
                                    { backgroundColor: cat.color ?? '#9CA3AF' },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.itemText,
                                    activa && styles.itemTextActivo,
                                ]}
                                numberOfLines={1}
                            >
                                {cat.nombre}
                            </Text>
                            {cat.es_sugerida && (
                                <View style={styles.sugeridaBadge}>
                                    <Text style={styles.sugeridaText}>Nueva</Text>
                                </View>
                            )}
                            {activa && (
                                <Ionicons name="checkmark-circle" size={20} color="#B5121B" />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
            <View style={styles.backdrop}>
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Seleccionar categoría</Text>
                        <TouchableOpacity onPress={onCerrar} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchWrapper}>
                        <Ionicons name="search-outline" size={18} color="#6B7280" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar categoría..."
                            placeholderTextColor="#9CA3AF"
                            value={busqueda}
                            onChangeText={setBusqueda}
                            autoCorrect={false}
                        />
                        {busqueda.length > 0 && (
                            <TouchableOpacity onPress={() => setBusqueda('')}>
                                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <FlatList
                        data={[]}
                        renderItem={null}
                        ListHeaderComponent={
                            <>
                                {renderSeccion(
                                    'SEGURIDAD Y AMBIENTE',
                                    seguridad,
                                    'shield-outline'
                                )}
                                {renderSeccion('CLIMA', clima, 'cloud-outline')}
                            </>
                        }
                        ListEmptyComponent={
                            <Text style={styles.empty}>
                                {busqueda
                                    ? 'Sin resultados'
                                    : 'Sin categorías disponibles'}
                            </Text>
                        }
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                    />

                    <TouchableOpacity
                        style={styles.crearBtn}
                        onPress={onCrearNueva}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add-circle-outline" size={20} color="#B5121B" />
                        <Text style={styles.crearBtnText}>Crear nueva categoría</Text>
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
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
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
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        margin: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: '#111827',
    },
    list: { maxHeight: 400 },
    listContent: { paddingHorizontal: 12, paddingBottom: 12 },
    seccionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 4,
        paddingTop: 12,
        paddingBottom: 6,
    },
    seccionTitulo: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 11,
        color: '#6B7280',
        letterSpacing: 0.5,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    itemActivo: { backgroundColor: '#FEF2F2' },
    colorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    itemText: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#374151',
    },
    itemTextActivo: {
        fontFamily: 'Poppins-SemiBold',
        color: '#B5121B',
    },
    sugeridaBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    sugeridaText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 9,
        color: '#92400E',
    },
    empty: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingVertical: 24,
    },
    crearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        margin: 12,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#B5121B',
        borderStyle: 'dashed',
    },
    crearBtnText: {
        color: '#B5121B',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
});