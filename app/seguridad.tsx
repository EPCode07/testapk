import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppBottomNav from '../components/AppBottomNav';
import AppHeader from '../components/AppHeader';
import { authService } from '../lib/user/authService';
import { biometricService } from '../lib/user/biometricService';

export default function SeguridadScreen() {
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState('Biometría');
    const [rememberUser, setRememberUser] = useState(true);

    useEffect(() => {
        (async () => {
            const available = await biometricService.isAvailable();
            const enabled = await biometricService.isEnabled();
            const type = await biometricService.getSupportedType();

            setBiometricAvailable(available);
            setBiometricEnabled(enabled);
            setBiometricType(type);
        })();
    }, []);

    const handleBiometricToggle = async (value: boolean) => {
        if (value) {
            if (!biometricAvailable) {
                showMessage({
                    message: 'Tu dispositivo no tiene biometría configurada',
                    type: 'warning',
                });
                return;
            }

            const storedUser = await authService.getStoredUser();
            if (!storedUser) {
                showMessage({
                    message: 'Inicia sesión primero',
                    type: 'warning',
                });
                return;
            }

            const ok = await biometricService.authenticate(
                `Confirma tu ${biometricType} para activar`
            );
            if (!ok) return;

            await biometricService.enable(storedUser.email);
            setBiometricEnabled(true);
            showMessage({
                message: `${biometricType} activada`,
                type: 'success',
            });
        } else {
            Alert.alert(
                `Desactivar ${biometricType}`,
                '¿Ya no quieres usar biometría para entrar?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Desactivar',
                        style: 'destructive',
                        onPress: async () => {
                            await biometricService.disable();
                            setBiometricEnabled(false);
                            showMessage({
                                message: `${biometricType} desactivada`,
                                type: 'info',
                            });
                        },
                    },
                ]
            );
        }
    };

    // Toggle recordar usuario
    const handleRememberUserToggle = (value: boolean) => {
        setRememberUser(value);
        showMessage({
            message: value
                ? 'La app recordará tu usuario'
                : 'La app olvidará tu usuario',
            type: 'info',
        });
        // TODO: guardar en AsyncStorage
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#D8DCE0" />

            <AppHeader variant="back" title="Seguridad" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Card: Contraseña */}
                <View style={styles.card}>
                    <View style={styles.itemRow}>
                        <View style={styles.itemIconContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color="#333" />
                        </View>
                        <View style={styles.itemTextContainer}>
                            <Text style={styles.itemLabel}>RECORDAR USUARIO</Text>
                            <Text style={styles.itemDescription}>
                                Guarda tu correo para no escribirlo cada vez
                            </Text>
                        </View>
                        <Switch
                            value={rememberUser}
                            onValueChange={handleRememberUserToggle}
                            trackColor={{ false: '#CCC', true: '#7A1C1C' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* Card: Biometría */}
                <View style={styles.card}>
                    <View style={styles.itemRow}>
                        <View style={styles.itemIconContainer}>
                            <Ionicons name="finger-print-outline" size={20} color="#333" />
                        </View>
                        <View style={styles.itemTextContainer}>
                            <Text style={styles.itemLabel}>{biometricType.toUpperCase()}</Text>
                            <Text style={styles.itemDescription}>
                                {biometricAvailable
                                    ? `Entra más rápido usando ${biometricType.toLowerCase()}`
                                    : 'No disponible en este dispositivo'}
                            </Text>
                        </View>
                        <Switch
                            value={biometricEnabled}
                            onValueChange={handleBiometricToggle}
                            disabled={!biometricAvailable}
                            trackColor={{ false: '#CCC', true: '#7A1C1C' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* Card: Cambiar contraseña */}
                <View style={styles.card}>
                    <TouchableOpacity style={styles.itemRow}>
                        <View style={styles.itemIconContainer}>
                            <Ionicons name="key-outline" size={20} color="#333" />
                        </View>
                        <View style={styles.itemTextContainer}>
                            <Text style={styles.itemLabel}>CAMBIAR CONTRASEÑA</Text>
                            <Text style={styles.itemDescription}>
                                Actualiza tu contraseña de acceso
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>
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

    card: {
        backgroundColor: '#E2E6E8',
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    itemIconContainer: {
        backgroundColor: '#CCCCCC',
        padding: 8,
        borderRadius: 8,
        marginRight: 12,
    },
    itemTextContainer: { flex: 1 },
    itemLabel: {
        fontSize: 11,
        color: '#888888',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    itemDescription: {
        fontSize: 13,
        color: '#333',
        marginTop: 4,
    },
});