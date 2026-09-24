import { Ionicons, Octicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabKey = 'inicio' | 'mapa' | 'galeria' | 'ajustes';

interface Props {
    active: TabKey;
}

export default function AppBottomNav({ active }: Props) {
    const insets = useSafeAreaInsets();

    const isActive = (key: TabKey) => active === key;
    const color = (key: TabKey) => (isActive(key) ? '#7A1C1C' : '#555555');

    return (
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom || 10 }]}>
            <TouchableOpacity
                style={styles.navItem}
                onPress={() => router.replace('/(tabs)' as any)}
            >
                <Octicons name="home" size={22} color={color('inicio')} />
                <Text style={[styles.navLabel, isActive('inicio') && styles.navLabelActive]}>
                    Inicio
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem}>
                <Ionicons name="location-outline" size={22} color={color('mapa')} />
                <Text style={[styles.navLabel, isActive('mapa') && styles.navLabelActive]}>
                    Mapa
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem}>
                <Ionicons name="image-outline" size={22} color={color('galeria')} />
                <Text style={[styles.navLabel, isActive('galeria') && styles.navLabelActive]}>
                    Galería
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.navItem}
                onPress={() => router.push('/seguridad' as any)}
            >
                <Ionicons name="settings-sharp" size={22} color={color('ajustes')} />
                <Text style={[styles.navLabel, isActive('ajustes') && styles.navLabelActive]}>
                    Ajustes
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#D8DCE0',
        paddingVertical: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    navItem: { alignItems: 'center' },
    navLabel: { fontSize: 11, color: '#555555', marginTop: 2 },
    navLabelActive: { color: '#7A1C1C', fontWeight: 'bold' },
});