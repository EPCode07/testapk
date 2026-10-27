import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clearAuthUser } from '@/lib/user/userStorage';
import AppHeader from '../components/AppHeader';
import { authService } from '../lib/user/authService';
import { biometricService } from '../lib/user/biometricService';

export default function SeguridadScreen() {
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState('Biometría');
    const [rememberUser, setRememberUser] = useState(true);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);



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

    const handleRememberUserToggle = (value: boolean) => {
        setRememberUser(value);
        showMessage({
            message: value
                ? 'La app recordará tu usuario'
                : 'La app olvidará tu usuario',
            type: 'info',
        });
    };


    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch { }
        await clearAuthUser();
        router.replace('/login' as any);
    };

    const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    const handleChangePassword = async (
        newPassword: string,
        confirmPassword: string,
    ) => {
        const next = newPassword.trim();
        const confirm = confirmPassword.trim();

        if (!next || !confirm) {
            showMessage({
                message: 'Debes ingresar una contraseña y confirmarla',
                type: 'warning',
            });
            return;
        }

        if (!regexPassword.test(next)) {
            showMessage({
                message:
                    'La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un símbolo',
                type: 'warning',
            });
            return;
        }

        if (next !== confirm) {
            showMessage({
                message: 'Las contraseñas no coinciden',
                type: 'danger',
            });
            return;
        }

        try {
            await authService.resetPassword(next, confirm);

            showMessage({
                message: 'Contraseña actualizada correctamente. Inicia sesión de nuevo.',
                type: 'success',
            });

            await handleLogout();
        } catch (error: any) {
            const firstError = error?.response?.data?.errors
                ? Object.values(error.response.data.errors).flat()?.[0]
                : null;

            const backendMessage =
                firstError ??
                error?.response?.data?.message ??
                error?.message ??
                'Intenta de nuevo';

            showMessage({
                message: 'Error al actualizar contraseña: ' + backendMessage,
                type: 'danger',
            });
        }
    };

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: '#ECEDEF' }}
            edges={['top']}
        >

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={{ backgroundColor: '#ECEDEF', flex: 1 }}>

                    <StatusBar barStyle="dark-content" backgroundColor="#ffffffff" />

                    <AppHeader variant="back" title="Seguridad" />


                    <ScrollView
                        contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        <View style={styles.card}>
                            <View style={styles.itemRow}>
                                <View style={styles.itemIconContainer}>
                                    <Ionicons name="mail-outline" size={20} color="#333" />
                                </View>
                                <View style={styles.itemTextContainer}>
                                    <Text style={styles.itemLabel}>RECORDAR CORREO ELECTRÓNICO</Text>
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

                        <View style={styles.card}>
                            <View style={styles.itemRow}>
                                <View style={styles.itemIconContainer}>
                                    <Ionicons name="key-outline" size={20} color="#333" />
                                </View>
                                <View style={styles.itemTextContainer}>
                                    <Text style={styles.itemLabel}>CAMBIAR CONTRASEÑA</Text>
                                    <View style={styles.passwordWrapper}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            placeholderTextColor="#999"
                                            secureTextEntry={!showPassword}
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword((v) => !v)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <Ionicons
                                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                                size={20}
                                                color="#666"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.itemRow}>
                                <View style={styles.itemIconContainer}>
                                    <Ionicons name="reload" size={20} color="#333" />
                                </View>
                                <View style={styles.itemTextContainer}>
                                    <Text style={styles.itemLabel}>REPETIR CONTRASEÑA</Text>
                                    <View style={styles.passwordWrapper}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            placeholderTextColor="#999"
                                            secureTextEntry={!showConfirmPassword}
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowConfirmPassword((v) => !v)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <Ionicons
                                                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                                size={20}
                                                color="#666"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity style={styles.button} onPress={() => handleChangePassword(newPassword, confirmPassword)}>
                                    <Text style={styles.buttonText}>Actualizar Contraseña</Text>

                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                </View></KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffffff' },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
    },

    card: {
        backgroundColor: '#ffffffff',
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
    buttonContainer: {
        alignItems: 'center',
        marginTop: 12,
        width: '100%',
    },
    button: {
        backgroundColor: '#B5121B',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        width: '100%',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center'
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        marginBottom: 8,
        marginTop: 4
    },
    passwordInput: {
        flex: 1,
        fontSize: 12,
        color: '#111',
        borderColor: '#8b888864',
        borderWidth: 1,
        borderRadius: 6,
        paddingLeft: 8,
        paddingTop: 6,
        paddingBottom: 6,
        marginRight: 10
    },

    forgotWrapper: {
        alignSelf: 'center',
        marginBottom: 20,
    },
    forgot: {
        color: '#D0D0D0',
        fontSize: 12,
        textDecorationLine: 'underline',
    },
});