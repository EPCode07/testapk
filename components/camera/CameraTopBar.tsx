import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type NombreIcono = keyof typeof Ionicons.glyphMap;

type Props = {
    onBack: () => void;
    savedCount?: number;
    saving?: boolean;
    onSave?: () => void;
    onLongPressSave?: () => void;
    timer: boolean;
    onToggleTimer: () => void;
    flash: 'off' | 'on';
    onToggleFlash: () => void;
    actividadNombre?: string;
    onPressActividad?: () => void;
    icon?: NombreIcono;
    /** 👇 Controla si se muestra el título central */
    showTitle?: boolean;
};

export default function CameraTopBar({
    onBack,
    timer,
    onToggleTimer,
    flash,
    onToggleFlash,
    actividadNombre = '',
    onPressActividad,
    icon = 'chevron-down',
    showTitle = true,
}: Props) {
    return (
        <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconButton} onPress={onBack}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {showTitle ? (
                <TouchableOpacity
                    style={styles.titleWrapper}
                    onPress={onPressActividad}
                    activeOpacity={0.7}
                    disabled={!onPressActividad}
                >
                    <Text style={styles.title} numberOfLines={1}>
                        {actividadNombre}
                    </Text>
                    <Ionicons name={icon} size={16} color="#FFFFFF" />
                </TouchableOpacity>
            ) : (
                <View style={styles.titleWrapper} />
            )}

            <View style={styles.topRightIcons}>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 8,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        maxWidth: '80%',
    },
    topRightIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});