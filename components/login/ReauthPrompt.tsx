import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { useSync } from '../../lib/sync/SyncContext';
import { useAuth } from '../../lib/user/AuthContext';
import { authService } from '../../lib/user/authService';

export default function ReauthPrompt() {
    const [visible, setVisible] = useState(false);
    const [email, setEmail] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dismissedRef = useRef(false);
    const { syncNow, syncExportacionesNow } = useSync();
    const { login, isOfflineSession, user } = useAuth();

    const onNetwork = useCallback(async (state: NetInfoState) => {
        const online = !!state.isConnected && state.isInternetReachable !== false;
        if (!online) {
            dismissedRef.current = false;
            return;
        }
        if (dismissedRef.current || !isOfflineSession) return;
        setEmail(user?.email ?? null);
        setVisible(true);
    }, [isOfflineSession, user?.email]);

    useEffect(() => {
        const unsub = NetInfo.addEventListener(onNetwork);
        return () => unsub();
    }, [onNetwork]);

    const submit = async () => {
        if (!email || !password || loading) return;
        setLoading(true);
        setError(null);
        try {
            await authService.login(email, password, false);
            setVisible(false);
            setPassword('');
            showMessage({ message: 'Sesión validada', type: 'success' });
            syncNow(true);
            syncExportacionesNow(true);
        } catch (e: any) {
            setError(e?.message ?? 'No se pudo validar la sesión');
        } finally {
            setLoading(false);
        }
    };

    const later = () => {
        dismissedRef.current = true;
        setVisible(false);
        setPassword('');
        setError(null);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={later}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.title}>Conexión recuperada</Text>
                    <Text style={styles.body}>
                        Trabajaste sin conexión. Confirma tu contraseña para sincronizar tus datos pendientes.
                    </Text>
                    {!!email && <Text style={styles.email}>{email}</Text>}

                    <TextInput
                        style={styles.input}
                        placeholder="Contraseña"
                        secureTextEntry
                        autoCapitalize="none"
                        value={password}
                        onChangeText={setPassword}
                        onSubmitEditing={submit}
                    />
                    {!!error && <Text style={styles.error}>{error}</Text>}

                    <View style={styles.row}>
                        <Pressable onPress={later} style={[styles.btn, styles.btnGhost]} disabled={loading}>
                            <Text style={styles.btnGhostText}>Más tarde</Text>
                        </Pressable>
                        <Pressable onPress={submit} style={[styles.btn, styles.btnPrimary]} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Validar</Text>}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 10 },
    title: { fontSize: 18, fontWeight: '700' },
    body: { fontSize: 14, color: '#444' },
    email: { fontSize: 13, color: '#8B1E22', fontWeight: '600' },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, fontSize: 15 },
    error: { color: '#B00020', fontSize: 13 },
    row: { flexDirection: 'row', gap: 10, marginTop: 6 },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    btnPrimary: { backgroundColor: '#8B1E22' },
    btnText: { color: '#fff', fontWeight: '600' },
    btnGhost: { borderWidth: 1, borderColor: '#8B1E22' },
    btnGhostText: { color: '#8B1E22', fontWeight: '600' },
});