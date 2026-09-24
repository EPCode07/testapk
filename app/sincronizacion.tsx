import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppBottomNav from '../components/AppBottomNav';
import AppHeader from '../components/AppHeader';
import { SyncNetwork, syncPreferences } from '../lib/sync/syncPreferences';

export default function SincronizacionScreen() {
    const [selected, setSelected] = useState<SyncNetwork>('wifi');
    const netInfo = useNetInfo();

    useEffect(() => {
        syncPreferences.getNetwork().then(setSelected);
    }, []);

    const handleSelect = async (value: SyncNetwork) => {
        setSelected(value);
        await syncPreferences.setNetwork(value);

        showMessage({
            message: value === 'wifi'
                ? 'Solo se sincronizará por WiFi'
                : 'Se sincronizará por WiFi o datos móviles',
            type: 'success',
            icon: 'success',
        });
    };

    const connectionLabel = () => {
        if (!netInfo.isConnected) return 'Sin conexión';
        if (netInfo.type === 'wifi') return 'Conectado a WiFi';
        if (netInfo.type === 'cellular') return 'Conectado a datos móviles';
        return 'Conectado';
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#D8DCE0" />

            <AppHeader variant="back" title="Sincronización" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Estado actual */}
                <View style={styles.statusCard}>
                    <Ionicons
                        name={netInfo.isConnected ? 'cloud-done-outline' : 'cloud-offline-outline'}
                        size={22}
                        color={netInfo.isConnected ? '#2E7D32' : '#C62828'}
                    />
                    <Text style={styles.statusText}>{connectionLabel()}</Text>
                </View>

                {/* Título sección */}
                <Text style={styles.sectionTitle}>¿Cuándo sincronizar?</Text>
                <Text style={styles.sectionSubtitle}>
                    Elige cómo la app sube las fotos pendientes al servidor.
                </Text>

                {/* Opción: Solo WiFi */}
                <TouchableOpacity
                    style={[
                        styles.optionCard,
                        selected === 'wifi' && styles.optionCardActive,
                    ]}
                    onPress={() => handleSelect('wifi')}
                    activeOpacity={0.85}
                >
                    <View style={styles.optionIcon}>
                        <Ionicons name="wifi" size={24} color="#7A1C1C" />
                    </View>
                    <View style={styles.optionText}>
                        <Text style={styles.optionTitle}>Solo WiFi</Text>
                        <Text style={styles.optionDesc}>
                            Ahorra datos móviles. Las fotos se subirán cuando haya WiFi.
                        </Text>
                    </View>
                    <View style={[styles.radio, selected === 'wifi' && styles.radioActive]}>
                        {selected === 'wifi' && <View style={styles.radioDot} />}
                    </View>
                </TouchableOpacity>

                {/* Opción: WiFi + Datos */}
                <TouchableOpacity
                    style={[
                        styles.optionCard,
                        selected === 'any' && styles.optionCardActive,
                    ]}
                    onPress={() => handleSelect('any')}
                    activeOpacity={0.85}
                >
                    <View style={styles.optionIcon}>
                        <Ionicons name="cellular" size={24} color="#7A1C1C" />
                    </View>
                    <View style={styles.optionText}>
                        <Text style={styles.optionTitle}>WiFi o datos móviles</Text>
                        <Text style={styles.optionDesc}>
                            Sincroniza apenas haya conexión. Consume datos móviles.
                        </Text>
                    </View>
                    <View style={[styles.radio, selected === 'any' && styles.radioActive]}>
                        {selected === 'any' && <View style={styles.radioDot} />}
                    </View>
                </TouchableOpacity>

                {/* Info adicional */}
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#666" />
                    <Text style={styles.infoText}>
                        Las fotos se guardan en el dispositivo hasta que se puedan subir.
                        Aunque estés sin conexión, no se pierde nada.
                    </Text>
                </View>
            </ScrollView>

            <AppBottomNav active="ajustes" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#C8CDD0' },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
    },

    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E2E6E8',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 24,
        gap: 10,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#7A1C1C',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#666',
        marginBottom: 16,
    },

    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E2E6E8',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionCardActive: {
        borderColor: '#7A1C1C',
        backgroundColor: '#F0E2E4',
    },
    optionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    optionText: { flex: 1 },
    optionTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 2,
    },
    optionDesc: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
    },

    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#999',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    radioActive: {
        borderColor: '#7A1C1C',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#7A1C1C',
    },

    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#D8DCE0',
        borderRadius: 12,
        padding: 14,
        marginTop: 12,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#555',
        lineHeight: 17,
    },
});