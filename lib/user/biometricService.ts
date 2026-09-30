import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_email';

export const biometricService = {
    /**
     * ¿El dispositivo soporta biometría Y el usuario tiene huella/face registrada?
     */
    async isAvailable(): Promise<boolean> {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) return false;

        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        return isEnrolled;
    },

    /**
     * ¿Qué tipo de biometría soporta el dispositivo?
     */
    async getSupportedType(): Promise<string> {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            return 'Face ID';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            return 'Huella digital';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            return 'Reconocimiento de iris';
        }
        return 'Biometría';
    },

    /**
     * Pide autenticación biométrica. Devuelve true si pasó.
     */
    async authenticate(promptMessage: string = 'Accede a tu cuenta'): Promise<boolean> {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage,
                cancelLabel: 'Cancelar',
                fallbackLabel: 'Usar contraseña',
                disableDeviceFallback: false,
            });

            return result.success;
        } catch (error) {
            console.error('Error en autenticación biométrica:', error);
            return false;
        }
    },

    /**
     * ¿El usuario ya activó biometría en la app?
     */
    async isEnabled(): Promise<boolean> {
        const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        return value === 'true';
    },

    /**
     * Habilita la biometría. Guarda el email para autocompletar.
     */
    async enable(email: string): Promise<void> {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
        await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
    },

    /**
     * Deshabilita la biometría.
     */
    async disable(): Promise<void> {
        await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
        await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
    },

    /**
     * Devuelve el email guardado (para autocompletar el input).
     */
    async getSavedEmail(): Promise<string | null> {
        return SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    },
};
