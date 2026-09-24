import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import CustomAlert from '../components/CustomAlert';
import { authService, AuthUser } from '../lib/user/authService';
import { biometricService } from '../lib/user/biometricService';
import { setUsuario } from '../lib/user/userStorage';

type Mode = 'welcome-back' | 'full-login';

export default function LoginScreen() {
    const [mode, setMode] = useState<Mode>('full-login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [savedUser, setSavedUser] = useState<AuthUser | null>(null);

    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricType, setBiometricType] = useState('Biometría');

    const [alert, setAlert] = useState({ visible: false, title: '', message: '' });

    // Al montar: decidir qué modo mostrar
    useEffect(() => {
        (async () => {
            const available = await biometricService.isAvailable();
            const enabled = await biometricService.isEnabled();
            const type = await biometricService.getSupportedType();
            const storedUser = await authService.getStoredUser();
            const hasToken = await authService.hasToken();

            setBiometricAvailable(available);
            setBiometricEnabled(enabled);
            setBiometricType(type);
            // 👇 AQUÍ
            console.log('🔍 LOGIN DEBUG:', {
                available,
                enabled,
                type,
                storedUser: storedUser ? storedUser.email : null,
                hasToken,
            });
            // ¿Modo welcome-back? → hay usuario + biometría activa + token válido
            if (storedUser && enabled && hasToken) {
                setSavedUser(storedUser);
                setEmail(storedUser.email);
                setMode('welcome-back');
            } else {
                setMode('full-login');
                if (storedUser?.email) setEmail(storedUser.email);
            }
            const rawToken = await SecureStore.getItemAsync('auth_token');
            const rawUser = await AsyncStorage.getItem('auth_user');
            console.log('🔑 RAW token:', rawToken);
            console.log('👤 RAW user:', rawUser);
        })();
    }, []);

    // ============ LOGIN NORMAL ============
    const handleLogin = async () => {
        if (!email.trim() || !password) {
            setAlert({
                visible: true,
                title: 'Atención',
                message: 'Ingresa correo y contraseña',
            });
            return;
        }

        try {
            setLoading(true);
            const user = await authService.login(email, password);
            await setUsuario(user.name);
            // Si la biometría está disponible y aún no está activada, preguntar
            if (biometricAvailable && !biometricEnabled) {
                setTimeout(() => askEnableBiometric(user), 400);
            }

            showMessage({
                message: `Bienvenido, ${user.name}`,
                type: 'success',
                icon: 'success',
            });

            router.replace('/(tabs)' as any);
        } catch (err: any) {
            setAlert({
                visible: true,
                title: 'Error',
                message: err.message ?? 'No se pudo iniciar sesión',
            });
        } finally {
            setLoading(false);
        }
    };

    // ============ LOGIN RÁPIDO (solo password) ============
    const handleQuickLogin = async () => {
        if (!password) {
            setAlert({
                visible: true,
                title: 'Atención',
                message: 'Ingresa tu contraseña',
            });
            return;
        }

        try {
            setLoading(true);
            const user = await authService.login(email, password);
            await setUsuario(user.name); showMessage({
                message: `Bienvenido, ${user.name}`,
                type: 'success',
                icon: 'success',
            });
            router.replace('/(tabs)' as any);
        } catch (err: any) {
            setAlert({
                visible: true,
                title: 'Error',
                message: err.message ?? 'No se pudo iniciar sesión',
            });
        } finally {
            setLoading(false);
        }
    };

    // ============ LOGIN BIOMÉTRICO ============
    const handleBiometricLogin = async () => {
        if (!biometricEnabled) {
            setAlert({
                visible: true,
                title: 'Biometría no activada',
                message: `Activa ${biometricType} desde tu perfil primero.`,
            });
            return;
        }

        const hasToken = await authService.hasToken();
        if (!hasToken) {
            setAlert({
                visible: true,
                title: 'Sin sesión',
                message: 'Inicia sesión con tu contraseña primero.',
            });
            return;
        }

        const ok = await biometricService.authenticate(
            `Confirma tu ${biometricType} para entrar`
        );
        if (!ok) return;

        setLoading(true);
        const user = await authService.me();
        setLoading(false);

        if (user) {
            await setUsuario(user.name);
            router.replace('/(tabs)' as any);
        } else {
            setAlert({
                visible: true,
                title: 'Sesión expirada',
                message: 'Por seguridad, ingresa tu contraseña de nuevo.',
            });
        }
    };

    // ============ ACTIVAR BIOMETRÍA ============
    const askEnableBiometric = (user: AuthUser) => {
        Alert.alert(
            `Activar ${biometricType}`,
            `¿Quieres usar ${biometricType} para ingresar más rápido la próxima vez?`,
            [
                { text: 'Ahora no', style: 'cancel' },
                {
                    text: 'Activar',
                    onPress: async () => {
                        const ok = await biometricService.authenticate(
                            `Confirma tu ${biometricType} para activar`
                        );
                        if (ok) {
                            await biometricService.enable(user.email);
                            setBiometricEnabled(true);
                            showMessage({
                                message: `${biometricType} activada`,
                                type: 'success',
                                icon: 'success',
                            });
                        }
                    },
                },
            ]
        );
    };

    // ============ CAMBIAR DE USUARIO ============
    const handleChangeUser = () => {
        setPassword('');
        setSavedUser(null);
        setMode('full-login');
    };

    const handleRecover = () => {
        showMessage({
            message: 'Te enviamos instrucciones para recuperar tu contraseña',
            type: 'info',
            icon: 'info',
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ImageBackground
                source={require('../assets/images/login-bg.png')}
                style={styles.bg}
                resizeMode="cover"
            >
                <View style={styles.overlay} />

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Header: icono + REPORTES */}
                        <View style={styles.topBrand}>
                            <View style={styles.logoBox}>
                                <Image
                                    source={require('../assets/images/app-logo.png')}
                                    style={styles.topLogo}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text style={styles.topBrandText}>REPORTES</Text>
                        </View>

                        {/* Card semitransparente */}
                        <BlurView intensity={70} tint="dark" style={styles.card}>
                            <View style={styles.cardContent}>
                                <Image
                                    source={require('../assets/images/logo-blanco.png')}
                                    style={styles.yhomaLogo}
                                    resizeMode="contain"
                                />

                                {/* ========== MODO WELCOME-BACK ========== */}
                                {mode === 'welcome-back' && savedUser && (
                                    <>
                                        <Text style={styles.title}>Bienvenido</Text>
                                        <Text style={styles.subtitle}>
                                            {savedUser.personal
                                                ? `${savedUser.personal.apellidos}, ${savedUser.personal.nombres}`
                                                : savedUser.name}
                                        </Text>

                                        <Text style={styles.label}>Contraseña</Text>
                                        <View style={styles.passwordWrapper}>
                                            <TextInput
                                                style={styles.passwordInput}
                                                placeholder="Ingresar Contraseña"
                                                placeholderTextColor="#999"
                                                secureTextEntry={!showPassword}
                                                value={password}
                                                onChangeText={setPassword}
                                                autoFocus
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

                                        <TouchableOpacity
                                            onPress={handleChangeUser}
                                            style={styles.forgotWrapper}
                                        >
                                            <Text style={styles.forgot}>
                                                ¿No eres tú? Cambiar de usuario
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Fila: [Iniciar Sesión] [👆] */}
                                        <View style={styles.rowButtons}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.primaryBtn,
                                                    { flex: 1, marginBottom: 0 },
                                                    loading && { opacity: 0.75 },
                                                ]}
                                                onPress={handleQuickLogin}
                                                disabled={loading}
                                                activeOpacity={0.85}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator color="#fff" />
                                                ) : (
                                                    <Text style={styles.primaryBtnText}>
                                                        Iniciar Sesión
                                                    </Text>
                                                )}
                                            </TouchableOpacity>

                                            {biometricAvailable && (
                                                <TouchableOpacity
                                                    style={styles.biometricSquareBtn}
                                                    onPress={handleBiometricLogin}
                                                    disabled={loading}
                                                    activeOpacity={0.85}
                                                >
                                                    <Ionicons
                                                        name="finger-print-outline"
                                                        size={26}
                                                        color="#7A1C1C"
                                                    />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </>
                                )}

                                {/* ========== MODO FULL-LOGIN ========== */}
                                {mode === 'full-login' && (
                                    <>
                                        <Text style={styles.title}>Iniciar Sesión</Text>
                                        <Text style={styles.subtitle}>
                                            Ingresa tus credenciales
                                        </Text>

                                        <Text style={styles.label}>Usuario</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ingresar Usuario"
                                            placeholderTextColor="#999"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            keyboardType="email-address"
                                            value={email}
                                            onChangeText={setEmail}
                                        />

                                        <Text style={styles.label}>Contraseña</Text>
                                        <View style={styles.passwordWrapper}>
                                            <TextInput
                                                style={styles.passwordInput}
                                                placeholder="Ingresar Contraseña"
                                                placeholderTextColor="#999"
                                                secureTextEntry={!showPassword}
                                                value={password}
                                                onChangeText={setPassword}
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

                                        <TouchableOpacity
                                            onPress={handleRecover}
                                            style={styles.forgotWrapper}
                                        >
                                            <Text style={styles.forgot}>
                                                ¿Olvidaste tu contraseña?
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.primaryBtn,
                                                loading && { opacity: 0.75 },
                                            ]}
                                            onPress={handleLogin}
                                            disabled={loading}
                                            activeOpacity={0.85}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <Text style={styles.primaryBtnText}>
                                                    Iniciar Sesión
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                )}

                                <Text style={styles.footerVersion}>
                                    Yhoma Reportes V1.0
                                </Text>
                            </View>
                        </BlurView>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>

            <CustomAlert
                visible={alert.visible}
                appName="Yhoma Reportes"
                appIconSource={require('../assets/images/app-logo.png')}
                title={alert.title}
                message={alert.message}
                onClose={() => setAlert((a) => ({ ...a, visible: false }))}
                onAccept={() => setAlert((a) => ({ ...a, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    bg: { flex: 1, width: '100%', height: '100%' },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 22,
        paddingTop: 60,
        paddingBottom: 40,
    },

    // Header superior
    topBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        justifyContent: 'center',
    },
    topLogo: {
        width: 52,
        height: 52,
    },
    logoBox: {
        marginRight: 10,
    },
    topBrandText: {
        fontFamily: 'Poppins-Bold',
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: '700',
        letterSpacing: 1.5,
        textAlign: 'center',
    },

    // Card semitransparente
    card: {
        borderColor: 'rgba(255, 255, 255, 1)',
        overflow: 'hidden',
    },
    cardContent: {
        paddingHorizontal: 22,
        paddingVertical: 26,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 1)',
        backgroundColor: 'rgba(0, 0, 0, 0.22)',
    },
    yhomaLogo: {
        width: 160,
        height: 60,
        alignSelf: 'center',
        marginBottom: 18,
    },

    title: {
        fontSize: 30,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'left',
        fontFamily: 'Poppins-Bold',
    },
    subtitle: {
        fontSize: 13,
        color: '#D0D0D0',
        textAlign: 'left',
        marginTop: 4,
        marginBottom: 22,
    },

    label: {
        color: '#E8E8E8',
        fontSize: 13,
        marginBottom: 6,
        marginLeft: 2,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#111',
        marginBottom: 14,
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 14,
        marginBottom: 8,
    },
    passwordInput: {
        flex: 1,
        fontSize: 15,
        color: '#111',
        paddingVertical: 12,
    },

    forgotWrapper: {
        alignSelf: 'center',
        marginBottom: 20,
    },
    forgot: {
        color: '#D0D0D0',
        fontSize: 12.5,
        textDecorationLine: 'underline',
    },

    primaryBtn: {
        backgroundColor: '#8B1E24',
        borderRadius: 10,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },

    // NUEVOS: fila de botones + botón cuadrado de huella
    rowButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    biometricSquareBtn: {
        width: 52,
        height: 52,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#7A1C1C',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    footerVersion: {
        textAlign: 'center',
        color: '#B8B8B8',
        fontSize: 11,
    },
});