import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Variant = 'main' | 'back';

interface Props {
    variant?: Variant;
    title?: string;                    // solo para variant='back'
    onMenuPress?: () => void;          // solo para variant='main'
    showMenuButton?: boolean;          // solo para variant='main'
    onBackPress?: () => void;          // solo para variant='back'
}

export default function AppHeader({
    variant = 'main',
    title,
    onMenuPress,
    showMenuButton = false,
    onBackPress,
}: Props) {
    const handleBack = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            router.back();
        }
    };

    return (
        <View style={styles.header}>
            {/* LADO IZQUIERDO */}
            <View style={styles.leftContainer}>
                {variant === 'back' && (
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                        <Ionicons name="arrow-back" size={24} color="#333333" />
                    </TouchableOpacity>
                )}

                <View style={styles.brandContainer}>
                    <View style={styles.logoBox}>
                        <Image
                            source={require('../assets/images/app-logo.png')}
                            style={styles.topLogo}
                            resizeMode="contain"
                        />
                    </View>
                    <View style={styles.brandTitleContainer}>
                        <Text style={styles.brandTitle}>
                            {variant === 'back' && title ? title : 'REPORTES'}
                        </Text>
                        <Text style={styles.brandSubtitle}>Yhoma Reportes V1.0</Text>
                    </View>
                </View>
            </View>

            {/* LADO DERECHO */}
            {variant === 'main' && (
                <View style={styles.headerIcons}>
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => router.push('/camera')}
                    >
                        <Ionicons name="camera-outline" size={22} color="#333333" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconBtn}>
                        <Ionicons name="notifications-outline" size={22} color="#333333" />
                    </TouchableOpacity>

                    {showMenuButton && (
                        <TouchableOpacity style={styles.iconBtn} onPress={onMenuPress}>
                            <Ionicons name="ellipsis-vertical" size={22} color="#333333" />
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#D8DCE0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 15,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backBtn: {
        padding: 6,
        marginRight: 4,
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoBox: { marginRight: 10 },
    topLogo: { width: 40, height: 40, backgroundColor: "#fff", },
    brandTitleContainer: { justifyContent: 'center' },
    brandTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
        letterSpacing: 0.5,
    },
    brandSubtitle: { fontSize: 10, color: '#777777' },
    headerIcons: { flexDirection: 'row', gap: 12 },
    iconBtn: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },

});