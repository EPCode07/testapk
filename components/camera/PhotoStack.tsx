import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
    count: number;
    lastUri: string | null;
    onPreview: () => void;
    onLongPress: () => void;
    onOpenGallery: () => void;
};

export default function PhotoStack({
    count,
    lastUri,
    onPreview,
    onLongPress,
    onOpenGallery,
}: Props) {
    return (
        <View style={styles.wrapper}>
            {/* Círculo: previsualizar última foto */}
            <TouchableOpacity
                style={styles.thumbnailContainer}
                onPress={onPreview}
                onLongPress={onLongPress}
                disabled={!lastUri}
                activeOpacity={0.7}
            >
                {lastUri ? (
                    <Image source={{ uri: lastUri }} style={styles.thumbnailImage} />
                ) : (
                    <View style={[styles.thumbnailImage, { backgroundColor: '#222' }]} />
                )}

                {count > 0 && (
                    <View style={styles.photoCountBadge}>
                        <Text style={styles.photoCountText}>{count}</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Flecha: ir a galería/lista */}
            <TouchableOpacity
                style={styles.arrowBadge}
                onPress={onOpenGallery}
                activeOpacity={0.7}
            >
                <Ionicons style={{ marginLeft: 2, marginTop: 1 }} name="chevron-forward" size={22} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { position: 'relative', width: 50, height: 50 },
    thumbnailContainer: {
        width: 58,
        height: 58,
        borderRadius: 28,
        borderWidth: 3,
        borderColor: '#B5121B',
        overflow: 'hidden',
    },
    thumbnailImage: { width: '100%', height: '100%' },
    arrowBadge: {
        position: 'absolute',
        bottom: -18,
        right: -14,
        backgroundColor: '#6D0B10',
        borderRadius: 14,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#B5121B',
    },
    photoCountBadge: {
        position: 'absolute',
        bottom: 2,
        left: 2,
        backgroundColor: 'rgba(0,0,0,0.75)',
        borderRadius: 8,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    photoCountText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
});