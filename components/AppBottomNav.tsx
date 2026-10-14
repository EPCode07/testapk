import { Ionicons, Octicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TabKey = 'inicio' | 'camera_now' | 'galeria' | 'reportes' | 'ajustes' | 'sucesos';

interface Props {
    active: TabKey;
}

export default function AppBottomNav({ active }: Props) {
    const insets = useSafeAreaInsets();

    const isActive = (key: TabKey) => active === key;
    const color = (key: TabKey) => (isActive(key) ? '#7A1C1C' : '#555555');

    const goTo = (path: string) => router.navigate(path as any);

    return (
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom || 10 }]}>
            <TouchableOpacity
                style={styles.navItem}
                onPress={() => goTo('/(tabs)')}
            >
                <Octicons
                    name={isActive('inicio') ? 'home-fill' : 'home'}
                    size={22}
                    color={color('inicio')}
                />
                <Text style={[styles.navLabel, isActive('inicio') && styles.navLabelActive]}>
                    Inicio
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.navItem}
                onPress={() => goTo('/(tabs)/mis-reportes')}
            >
                <Ionicons
                    name={isActive('reportes') ? 'document-text' : 'document-text-outline'}
                    size={22}
                    color={color('reportes')}
                />
                <Text style={[styles.navLabel, isActive('reportes') && styles.navLabelActive]}>
                    Mis Reportes
                </Text>
            </TouchableOpacity>


            <TouchableOpacity
                style={styles.navItem}
                onPress={() => goTo('/(tabs)/sucesos')}
            >
                <Ionicons
                    name={isActive('sucesos') ? 'list' : 'list-outline'}
                    size={22}
                    color={color('sucesos')}
                />
                <Text style={[styles.navLabel, isActive('sucesos') && styles.navLabelActive]}>
                    Sucesos
                </Text>
            </TouchableOpacity>


            <TouchableOpacity
                style={styles.navItem}
                onPress={() => goTo('/(tabs)/camera_now')}
            >
                <Ionicons
                    name={isActive('camera_now') ? 'camera' : 'camera-outline'}
                    size={22}
                    color={color('camera_now')}
                />
                <Text style={[styles.navLabel, isActive('camera_now') && styles.navLabelActive]}>
                    Cámara
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.navItem}
                onPress={() => goTo('/(tabs)/galeria')}
            >
                <Ionicons
                    name={isActive('galeria') ? 'images' : 'images-outline'}
                    size={22}
                    color={color('galeria')}
                />
                <Text style={[styles.navLabel, isActive('galeria') && styles.navLabelActive]}>
                    Galería
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.navItem}
                onPress={() => goTo('/(tabs)/ajustes')}
            >
                <Ionicons
                    name={isActive('ajustes') ? 'settings' : 'settings-outline'}
                    size={22}
                    color={color('ajustes')}
                />
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
        backgroundColor: '#ffffff',
        paddingVertical: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    navItem: { alignItems: 'center' },
    navLabel: { fontSize: 11, color: '#555555', marginTop: 2 },
    navLabelActive: { color: '#7A1C1C', fontWeight: 'bold' },
});