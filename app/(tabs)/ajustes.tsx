// app/(tabs)/ajustes.tsx
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { Asset } from 'expo-asset';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AppHeader from '../../components/AppHeader';
import CustomAlert from '../../components/CustomAlert';
import DescargarDataModal from '../../components/DescargarDataModal';

import { CacheMetadata, proyectoCache } from '../../lib/proyectos/proyectoCache';
import { useSync } from '../../lib/sync/SyncContext';
import { SyncNetwork, syncPreferences } from '../../lib/sync/syncPreferences';
import { authService, AuthUser } from '../../lib/user/authService';
import { clearAuthUser, getUsuario } from '../../lib/user/userStorage';
import { downloadWordReport, generatePhotoReportPDF } from '../../lib/utils/reportGenerator';

export default function AjustesScreen() {
    const insets = useSafeAreaInsets();
    const netInfo = useNetInfo();

    // ------- Estado PRIMER ARCHIVO -------
    const [alert, setAlert] = useState({ visible: false, title: '', message: '' });
    const [generando, setGenerando] = useState(false);
    const [isAlertVisible, setIsAlertVisible] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [usuario, setUsuario] = useState<string | null>(null);
    const [syncNetwork, setSyncNetwork] = useState<SyncNetwork>('wifi');
    const [menuVisible, setMenuVisible] = useState(false);

    // ------- Estado SEGUNDO ARCHIVO -------
    const [modalDescargaVisible, setModalDescargaVisible] = useState(false);
    const [meta, setMeta] = useState<CacheMetadata | null>(null);

    // ------- Sync context -------
    const {
        isSyncing,
        isOnline,
        pendingCount,
        pendingExportacionesCount,
        syncExportacionesNow,
    } = useSync();

    const hasPending = pendingCount > 0;
    const isErrorState = !isOnline || hasPending;

    // ------- Derivados PRIMER ARCHIVO -------
    const syncStatusText = isSyncing
        ? 'Sincronizando...'
        : !isOnline
            ? 'Sin conexión · ' + pendingCount + ' foto(s) por subir'
            : hasPending
                ? `${pendingCount} foto(s) pendiente(s)`
                : 'Estado de sincronización OK';

    const syncColor = isErrorState || isSyncing ? '#C62828' : '#2E7D32';
    const syncIconName = isSyncing
        ? 'sync-outline'
        : !isOnline
            ? 'cloud-offline-outline'
            : hasPending
                ? 'alert-circle-outline'
                : 'cloud-done-outline';

    const getConnectionLabel = () => {
        if (!netInfo.isConnected) return 'Sin conexión';
        if (netInfo.type === 'wifi') return 'Wi-Fi';
        if (netInfo.type === 'cellular') return 'Datos móviles';
        return 'Wifi y Datos';
    };

    // ------- Focus: carga de datos (fusionado) -------
    useFocusEffect(
        useCallback(() => {
            (async () => {
                // 1. Nombre del usuario (legacy)
                getUsuario().then(setUsuario);

                // 2. Preferencia de red
                const pref = await syncPreferences.getNetwork();
                setSyncNetwork(pref);

                // 3. Usuario en caché
                const cached = await authService.getStoredUser();
                if (cached) setUser(cached);

                // 4. Refrescar desde backend (silencioso)
                const fresh = await authService.me();
                if (fresh) setUser(fresh);

                // 5. Metadata de caché local (del segundo archivo)
                proyectoCache.leerMetadata().then(setMeta);
            })();
        }, [])
    );

    // ------- Handlers PRIMER ARCHIVO -------
    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch { }
        await clearAuthUser();
        router.replace('/login' as any);
    };

    const handleOptionSelect = (action: string) => {
        setMenuVisible(false);
        if (action === 'asset') {
            handleGenerateWithAsset();
        } else if (action === 'download') {
            handleDownloadWord();
        }
    };

    const handleRefreshProfile = async () => {
        setMenuVisible(false);
        const fresh = await authService.me();
        if (fresh) {
            setUser(fresh);
            setAlert({
                visible: true,
                title: 'Actualizado',
                message: 'Perfil actualizado correctamente',
            });
        } else {
            setAlert({
                visible: true,
                title: 'Error',
                message: 'No se pudo actualizar el perfil',
            });
        }
    };

    async function handleGenerateWithAsset() {
        try {
            const asset = Asset.fromModule(
                require('../assets/documentos/pdf/Formato_IT_RD_V2_02.07.26.pdf')
            );
            await asset.downloadAsync();

            let baseUri = asset.localUri;
            if (!baseUri) {
                throw new Error('No se pudo cargar la plantilla PDF local.');
            }

            const response = await fetch(
                `${process.env.EXPO_PUBLIC_BACKEND_URL}/listall?usuario=${user}`,
                {
                    headers: {
                        'x-api-secret': process.env.EXPO_PUBLIC_API_SECRET ?? '',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const json = await response.json();
            if (!json.success) {
                throw new Error(json.error || 'Error consultando fotos');
            }

            const items = json.data;
            await generatePhotoReportPDF(items, baseUri);
        } catch (error) {
            console.error('Error al generar el PDF con datos de Supabase:', error);
        }
    }

    async function handleDownloadWord() {
        setGenerando(true);
        try {
            await downloadWordReport();
        } catch (error: any) {
            setIsAlertVisible(true);
        } finally {
            setGenerando(false);
        }
    }

    // ------- Handlers SEGUNDO ARCHIVO -------
    const handleDescargarData = () => {
        if (!isOnline) {
            showMessage({
                message: 'Sin conexión',
                description: 'Necesitas internet para descargar los datos.',
                type: 'danger',
                icon: 'danger',
            });
            return;
        }
        setModalDescargaVisible(true);
    };

    const handleSubirPendientes = async () => {
        if (pendingExportacionesCount === 0) return;

        if (!isOnline) {
            showMessage({
                message: 'Sin conexión',
                description: 'No hay conexión para subir las fotos pendientes.',
                type: 'warning',
                icon: 'warning',
            });
            return;
        }

        try {
            await syncExportacionesNow(true);
            showMessage({
                message: 'Subida completada',
                type: 'success',
                icon: 'success',
            });
        } catch (err) {
            showMessage({
                message: 'Error al subir',
                description: 'Revisa la pantalla de Sincronización.',
                type: 'danger',
            });
        }
    };

    const handleLimpiarCache = () => {
        Alert.alert(
            'Limpiar caché',
            'Se eliminarán los proyectos, estaciones y actividades guardadas localmente. La próxima vez que entres con conexión se descargarán de nuevo.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Limpiar',
                    style: 'destructive',
                    onPress: async () => {
                        await proyectoCache.limpiar();
                        setMeta(null);
                        showMessage({
                            message: 'Caché eliminada',
                            type: 'success',
                            icon: 'success',
                        });
                    },
                },
            ]
        );
    };

    const formatearFecha = (ts: number | null | undefined) => {
        if (!ts) return 'Nunca';
        const ahora = Date.now();
        const diff = ahora - ts;
        const minutos = Math.floor(diff / 60000);
        const horas = Math.floor(diff / 3600000);
        const dias = Math.floor(diff / 86400000);

        if (minutos < 1) return 'hace unos segundos';
        if (minutos < 60) return `hace ${minutos} min`;
        if (horas < 24) return `hace ${horas} h`;
        return `hace ${dias} día${dias > 1 ? 's' : ''}`;
    };


    const hayCache = meta !== null;
    const isConnected = netInfo.isConnected;
    const statusColor = isConnected ? '#333' : '#C62828';

    // ----------------------------------------------------------------
    //  RENDER
    // ----------------------------------------------------------------
    return (
        <SafeAreaView style={styles.container} edges={['top']}>

            <View style={{ backgroundColor: '#ECEDEF', flex: 1 }}>

                <StatusBar barStyle="dark-content" backgroundColor="#ECEDEF" />

                <AppHeader
                    variant="main"
                    showMenuButton={true}
                    onMenuPress={() => setMenuVisible(true)}
                />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ================= PERFIL ================= */}
                    <View style={styles.card}>
                        <Text style={styles.cardSectionTitle}>Perfil</Text>

                        <TouchableOpacity
                            style={styles.itemRow}
                            onPress={() => router.push('/set-usuario' as any)}
                        >
                            <View style={styles.itemRow}>
                                {user?.personal?.foto ? (
                                    <Image
                                        source={{
                                            uri: `${process.env.EXPO_PUBLIC_BACKEND_URL}/storage/${user.personal.foto}`,
                                        }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <View style={styles.itemIconContainer}>
                                        <Ionicons name="person-outline" size={20} color="#333" />
                                    </View>
                                )}
                                <View style={styles.itemTextContainer}>
                                    <Text style={styles.itemLabel}>NOMBRE</Text>
                                    <Text style={styles.itemValue}>{user?.name ?? '—'}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.itemRow}>
                            <View style={styles.itemIconContainer}>
                                <Ionicons name="call-outline" size={20} color="#333" />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemLabel}>CELULAR</Text>
                                <Text style={styles.itemValue}>
                                    {user?.personal?.telefono ?? '—'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.itemRow}>
                            <View style={styles.itemIconContainer}>
                                <Ionicons name="mail-outline" size={20} color="#333" />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemLabel}>CORREO</Text>
                                <Text style={styles.itemValue}>{user?.email ?? '—'}</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.itemRow}>
                            <View style={styles.itemIconContainer}>
                                <Ionicons name="briefcase-outline" size={20} color="#333" />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemLabel}>ÁREA</Text>
                                <Text style={styles.itemValue}>{user?.area ?? '—'}</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.itemRow}
                            onPress={() => router.push('/seguridad' as any)}
                        >
                            <View style={styles.itemIconContainer}>
                                <Ionicons name="key-outline" size={20} color="#333" />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemLabel}>SEGURIDAD</Text>
                                <Text style={styles.itemValue}>Biometría, Contraseña</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* ================= ESTADO / CONEXIÓN ================= */}
                    <View style={styles.card}>
                        <Text style={styles.cardSectionTitle}>Estado</Text>

                        <View style={styles.itemRow}>
                            <View style={styles.itemIconContainer}>
                                <Ionicons
                                    name={
                                        isOnline
                                            ? 'cloud-done-outline'
                                            : 'cloud-offline-outline'
                                    }
                                    size={20}
                                    color={isOnline ? '#2E7D32' : '#C62828'}
                                />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemLabel}>CONEXIÓN</Text>
                                <Text
                                    style={[
                                        styles.itemValue,
                                        !isOnline && styles.textOffline,
                                    ]}
                                >
                                    {isOnline ? 'Conectado' : 'Sin conexión'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.itemRow}>
                            <View style={styles.itemIconContainer}>
                                <Ionicons name="time-outline" size={20} color="#333" />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemLabel}>ÚLTIMA DESCARGA</Text>
                                <Text style={styles.itemValue}>
                                    {formatearFecha(meta?.ultimaActualizacion)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.itemRow}>
                            <View style={styles.itemIconContainer}>
                                <Ionicons
                                    name="cellular-outline"
                                    size={20}
                                    color={statusColor}
                                />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemLabel}>RED ACTUAL</Text>
                                <Text style={styles.itemValue}>{getConnectionLabel()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* ================= DATOS LOCALES ================= */}
                    <View style={styles.card}>
                        <Text style={styles.cardSectionTitle}>Datos locales</Text>

                        <DataRow
                            icon="folder-outline"
                            label="Proyectos"
                            value={meta?.totalProyectos ?? 0}
                        />
                        <View style={styles.divider} />
                        <DataRow
                            icon="location-outline"
                            label="Estaciones"
                            value={meta?.totalEstaciones ?? 0}
                        />
                        <View style={styles.divider} />
                        <DataRow
                            icon="list-outline"
                            label="Actividades"
                            value={meta?.totalActividades ?? 0}
                        />
                        <View style={styles.divider} />
                        <DataRow
                            icon="people-outline"
                            label="Supervisores"
                            value={meta?.totalSupervisores ?? 0}
                        />
                        <View style={styles.divider} />
                        <DataRow
                            icon="cloud-upload-outline"
                            label="Fotos pendientes"
                            value={pendingExportacionesCount}
                            highlight={pendingExportacionesCount > 0}
                        />
                    </View>

                    {/* ================= SINCRONIZACIÓN ================= */}
                    <View style={styles.card}>
                        <Text style={styles.cardSectionTitle}>Sincronización</Text>

                        <TouchableOpacity
                            style={styles.itemRow}
                            onPress={() => router.push('/sincronizacion' as any)}
                        >
                            <View style={styles.itemIconContainer}>
                                <Ionicons
                                    name={
                                        syncNetwork === 'wifi'
                                            ? 'wifi-outline'
                                            : 'cellular-outline'
                                    }
                                    size={20}
                                    color={statusColor}
                                />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemLabel}>SINCRONIZACIÓN</Text>
                                <Text
                                    style={[
                                        styles.itemValue,
                                        !isConnected && styles.textOffline,
                                    ]}
                                >
                                    {syncNetwork === 'wifi'
                                        ? 'Solo WiFi'
                                        : 'WiFi y datos móviles'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#666" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.itemRow}>
                            <Text style={[styles.syncStateText, { color: syncColor }]}>
                                {syncStatusText}
                            </Text>
                            <Ionicons name={syncIconName} size={22} color={syncColor} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* Descargar datos */}
                        <TouchableOpacity
                            style={[styles.primaryButton, !isOnline && styles.buttonDisabled]}
                            onPress={handleDescargarData}
                            disabled={!isOnline}
                            activeOpacity={0.85}
                        >
                            <Ionicons
                                name="cloud-download-outline"
                                size={20}
                                color="#FFFFFF"
                            />
                            <View style={styles.buttonTextContainer}>
                                <Text style={styles.primaryButtonText}>
                                    {hayCache ? 'Actualizar datos' : 'Descargar datos'}
                                </Text>
                                <Text style={styles.primaryButtonHint}>
                                    {hayCache
                                        ? 'Actualiza proyectos y actividades'
                                        : 'Descarga antes de ir a campo'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Subir pendientes */}
                        <TouchableOpacity
                            style={[
                                styles.secondaryButton,
                                (pendingExportacionesCount === 0 || !isOnline) &&
                                styles.buttonDisabled,
                            ]}
                            onPress={handleSubirPendientes}
                            disabled={
                                pendingExportacionesCount === 0 || !isOnline || isSyncing
                            }
                            activeOpacity={0.85}
                        >
                            <Ionicons
                                name="cloud-upload-outline"
                                size={20}
                                color={pendingExportacionesCount > 0 ? '#7A1C1C' : '#888888'}
                            />
                            <View style={styles.buttonTextContainer}>
                                <Text
                                    style={[
                                        styles.secondaryButtonText,
                                        pendingExportacionesCount === 0 && {
                                            color: '#888888',
                                        },
                                    ]}
                                >
                                    {isSyncing
                                        ? 'Subiendo...'
                                        : pendingExportacionesCount > 0
                                            ? `Subir pendientes (${pendingExportacionesCount})`
                                            : 'Sin pendientes'}
                                </Text>
                                <Text style={styles.secondaryButtonHint}>
                                    {pendingExportacionesCount > 0
                                        ? 'Fotos guardadas esperando subir'
                                        : 'Todo está sincronizado'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* ================= ACCIONES ================= */}
                    <View style={styles.card}>
                        <Text style={styles.cardSectionTitle}>Acciones</Text>

                        <TouchableOpacity
                            style={styles.itemRow}
                            onPress={handleLimpiarCache}
                        >
                            <View style={styles.itemIconContainer}>
                                <Ionicons name="trash-outline" size={20} color="#7A1C1C" />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemLabel}>CACHÉ LOCAL</Text>
                                <Text style={[styles.itemValue, { color: '#7A1C1C' }]}>
                                    Limpiar caché de datos
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#7A1C1C" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color="#7A1C1C" />
                        <Text style={styles.logoutText}>Cerrar Sesión</Text>
                    </TouchableOpacity>

                    <Text style={styles.footerVersion}>Yhoma Reportes V1.0</Text>
                </ScrollView>


                {/* ================= MODAL MENÚ (PRIMER ARCHIVO) ================= */}
                <Modal
                    visible={menuVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setMenuVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setMenuVisible(false)}
                    >
                        <View style={styles.menuContainer}>
                            {/* <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleOptionSelect('asset')}
                            >
                                <Ionicons
                                    name="document-text-outline"
                                    size={20}
                                    color="#8B1E24"
                                    style={styles.menuIcon}
                                />
                                <Text style={styles.menuText}>Descargar PDF</Text>
                            </TouchableOpacity>

                            <View style={styles.separator} />

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleOptionSelect('download')}
                            >
                                <Ionicons
                                    name="document-outline"
                                    size={20}
                                    color="#114ccbff"
                                    style={styles.menuIcon}
                                />
                                <Text style={styles.menuText}>Descargar Word</Text>
                            </TouchableOpacity>

                            <View style={styles.separator} /> */}

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={handleRefreshProfile}
                            >
                                <Ionicons
                                    name="refresh-outline"
                                    size={20}
                                    color="#2E7D32"
                                    style={styles.menuIcon}
                                />
                                <Text style={styles.menuText}>Refrescar datos</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* ================= MODAL DESCARGA (SEGUNDO ARCHIVO) ================= */}
                <DescargarDataModal
                    visible={modalDescargaVisible}
                    onClose={() => setModalDescargaVisible(false)}
                    onSuccess={() => {
                        proyectoCache.leerMetadata().then(setMeta);
                    }}
                />

                {/* ================= CUSTOM ALERT (PRIMER ARCHIVO) ================= */}
                <CustomAlert
                    visible={alert.visible}
                    appName="Yhoma Reportes"
                    appIconSource={require('../../assets/images/app-logo.png')}
                    title={alert.title}
                    message={alert.message}
                    onClose={() => setAlert({ ...alert, visible: false })}
                    onAccept={() => setAlert({ ...alert, visible: false })}
                />

                <CustomAlert
                    visible={isAlertVisible}
                    appName="Yhoma Reportes"
                    appIconSource={require('../../assets/images/app-logo.png')}
                    title="Error al generar el reporte"
                    message="No se pudo generar el archivo Word."
                    onClose={() => setIsAlertVisible(false)}
                    onAccept={() => setIsAlertVisible(false)}
                />
            </View>
        </SafeAreaView>
    );
}

// ---------------- DataRow (del segundo archivo, con estilos del primero) ----------------
function DataRow({
    icon,
    label,
    value,
    highlight,
}: {
    icon: any;
    label: string;
    value: number;
    highlight?: boolean;
}) {
    return (
        <View style={styles.itemRow}>
            <View style={styles.itemIconContainer}>
                <Ionicons name={icon} size={20} color="#000000ff" />
            </View>
            <View style={styles.itemTextContainer}>
                <Text style={styles.itemLabel}>{label.toUpperCase()}</Text>
                <Text
                    style={[styles.itemValue, highlight && { color: '#7A1C1C' }]}
                >
                    {value}
                </Text>
            </View>
        </View>
    );
}

// ---------------- ESTILOS (del PRIMER ARCHIVO) ----------------
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffffff',
    },
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
    cardSectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#7A1C1C',
        marginBottom: 12,
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
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#CCCCCC',
    },
    itemTextContainer: {
        flex: 1,
    },
    itemLabel: {
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
        color: '#7B7B7B',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    itemValue: {
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
        color: '#222222',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#D0D4D7',
        marginVertical: 4,
    },
    syncStateText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
    textOffline: {
        color: '#C62828',
    },
    buttonTextContainer: {
        flex: 1,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#7A1C1C',
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginTop: 10,
        marginBottom: 10,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
    primaryButtonHint: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 11,
        marginTop: 2,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#7A1C1C',
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 6,
    },
    secondaryButtonText: {
        color: '#7A1C1C',
        fontSize: 15,
        fontWeight: 'bold',
    },
    secondaryButtonHint: {
        color: '#666666',
        fontSize: 11,
        marginTop: 2,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    logoutButton: {
        borderWidth: 1.5,
        borderColor: '#7A1C1C',
        borderRadius: 25,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: 'transparent',
    },
    logoutText: {
        color: '#7A1C1C',
        fontWeight: 'bold',
        fontSize: 15,
        marginLeft: 8,
    },
    footerVersion: {
        textAlign: 'center',
        color: '#888888',
        fontSize: 11,
        marginTop: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    menuContainer: {
        marginTop: 60,
        marginRight: 20,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        width: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        paddingVertical: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    menuIcon: {
        marginRight: 12,
    },
    menuText: {
        fontSize: 15,
        color: '#333333',
    },
    separator: {
        height: 1,
        backgroundColor: '#E0E0E0',
    },
});