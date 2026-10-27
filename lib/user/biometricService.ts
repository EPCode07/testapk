import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_email';

export const biometricService = {

    async isAvailable(): Promise<boolean> {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) return false;

        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        return isEnrolled;
    },

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

    async isEnabled(): Promise<boolean> {
        const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        return value === 'true';
    },

    async enable(email: string): Promise<void> {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
        await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
    },

    async disable(): Promise<void> {
        await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
        await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
    },

    async getSavedEmail(): Promise<string | null> {
        return SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    },
};
