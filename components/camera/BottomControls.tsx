import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import SyncIcon from '../ui/icon-syn';
import PhotoStack from './PhotoStack';

type Props = {
    cameraReady: boolean;
    isCapturing: boolean;   // 👈 nuevo
    onTakePicture: () => void;
    onFlipCamera: () => void;
    photoCount: number;
    lastPhotoUri: string | null;
    onPreviewPhoto: () => void;
    onDiscardPhotos: () => void;
    onOpenGallery: () => void;
};
export default function BottomControls({
    cameraReady,
    isCapturing,
    onTakePicture,
    onFlipCamera,
    photoCount,
    lastPhotoUri,
    onPreviewPhoto,
    onDiscardPhotos,
    onOpenGallery,
}: Props) {
    const shutterDisabled = !cameraReady || isCapturing;

    return (
        <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.sideButton} onPress={onFlipCamera}>
                <SyncIcon width={40} height={40} color="#ffffffff" strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.shutterButtonOuter, shutterDisabled && { opacity: 0.6 }]}
                onPress={onTakePicture}
                disabled={shutterDisabled}
                activeOpacity={0.8}
            >
                {isCapturing ? (
                    <ActivityIndicator size="small" color="#000000" />
                ) : (
                    <View style={styles.shutterButtonInner} />
                )}
            </TouchableOpacity>

            <PhotoStack
                count={photoCount}
                lastUri={lastPhotoUri}
                onPreview={onPreviewPhoto}
                onLongPress={onDiscardPhotos}
                onOpenGallery={onOpenGallery}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#000000',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    sideButton: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: '135deg' }],
    },
    shutterButtonOuter: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 6,
        borderColor: '#ACACAC',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shutterButtonInner: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: '#FFFFFF',
    },
    rotateIcon: {
        transform: [{ rotate: '90deg' }],
    },
});