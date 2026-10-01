import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
type Props = {
    onBack: () => void;
    savedCount: number;
    saving: boolean;
    onSave: () => void;
    onLongPressSave: () => void;
    timer: boolean;
    onToggleTimer: () => void;
    flash: 'off' | 'on';
    onToggleFlash: () => void;
    actividadNombre: string;      // 👈 nuevo
    onPressActividad: () => void; // 👈 nuevo
};

export default function CameraTopBar({
    onBack,
    savedCount,
    saving,
    onSave,
    onLongPressSave,
    timer,
    onToggleTimer,
    flash,
    onToggleFlash,
    actividadNombre,
    onPressActividad,
}: Props) {
    return (
        <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconButton} onPress={onBack}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* 🔑 Título clickeable en el centro */}
            <TouchableOpacity
                style={styles.titleWrapper}
                onPress={onPressActividad}
                activeOpacity={0.7}
            >
                <Text style={styles.title} numberOfLines={1}>
                    {actividadNombre}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.topRightIcons}>
                {/* {savedCount > 0 && (
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={onSave}
                        onLongPress={onLongPressSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#4DA6FF" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={22} color="#4DA6FF" />
                                <View style={styles.saveBadge}>
                                    <Text style={styles.saveBadgeText}>{savedCount}</Text>
                                </View>
                            </>
                        )}
                    </TouchableOpacity>
                )} */}

                <TouchableOpacity style={styles.iconButton} onPress={onToggleTimer}>
                    <Ionicons
                        name="timer-outline"
                        size={22}
                        color={timer ? '#4DA6FF' : '#FFFFFF'}
                    />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={onToggleFlash}>
                    <Ionicons
                        name="flash"
                        size={22}
                        color={flash === 'on' ? '#FFD700' : '#FFFFFF'}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#000000',
    },
    topRightIcons: { flexDirection: 'row', gap: 20 },
    iconButton: { padding: 4 },
    saveBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#4DA6FF',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#000000',
    },
    saveBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },

    timerBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#4DA6FF',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#000000',
    },
    timerBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: 'bold',
    },
    titleWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        maxWidth: 220,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});