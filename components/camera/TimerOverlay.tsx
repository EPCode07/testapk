import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

type Props = {
    countdown: number | null;   // null = oculto, 3/2/1 = mostrando número
};

export default function TimerOverlay({ countdown }: Props) {
    const scale = useSharedValue(0.4);
    const opacity = useSharedValue(0);

    useEffect(() => {
        console.log('🎨 TimerOverlay render, countdown =', countdown);
        if (countdown === null) return;
        scale.value = 0.4;
        opacity.value = 0;
        scale.value = withSequence(
            withTiming(1.15, { duration: 150 }),
            withTiming(1, { duration: 150 }),
        );
        opacity.value = withTiming(1, { duration: 120 });
    }, [countdown]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    if (countdown === null) return null;

    return (
        <View style={styles.overlay} pointerEvents="none">
            <Animated.View style={[styles.circle, animatedStyle]}>
                <Text style={styles.number}>{countdown}</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
        zIndex: 999,
    },
    circle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    number: {
        color: '#FFFFFF',
        fontSize: 80,
        fontWeight: 'bold',
    },
});