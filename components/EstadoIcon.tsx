import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

export type EstadoProyecto =
    | 'iniciar'
    | 'en_progreso'
    | 'retrasada'
    | 'observada'
    | 'completado';

interface Props {
    estado: EstadoProyecto;
    size?: number;
    strokeWidth?: number;
}

// ============================================================
// COLORES POR ESTADO
// ============================================================
const COLORS: Record<EstadoProyecto, string> = {
    iniciar: '#D98E04',
    en_progreso: '#2563EB',
    retrasada: '#DC2626',
    observada: '#6F42C1',
    completado: '#2E8B57',
};

// ============================================================
// ICONOS (SVG)
// ============================================================
function IconPendiente({ size, color, strokeWidth }: { size: number; color: string; strokeWidth: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
            <G>
                <Path d="M8.41667 1.81833C9.46252 1.61593 10.5375 1.61593 11.5833 1.81833" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M11.5833 18.1817C10.5375 18.3841 9.46252 18.3841 8.41667 18.1817" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M14.6742 3.10083C15.5587 3.70018 16.3198 4.46405 16.9158 5.35083" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M1.81833 11.5833C1.61593 10.5375 1.61593 9.46251 1.81833 8.41666" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M16.8992 14.6742C16.2998 15.5587 15.5359 16.3198 14.6492 16.9158" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M18.1817 8.41666C18.3841 9.46251 18.3841 10.5375 18.1817 11.5833" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M3.10083 5.32583C3.70018 4.44128 4.46405 3.68023 5.35083 3.08417" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M5.32583 16.8992C4.44128 16.2998 3.68023 15.5359 3.08417 14.6492" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            </G>
        </Svg>
    );
}

function IconObservado({ size, color, strokeWidth }: { size: number; color: string; strokeWidth: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
            <G>
                <Path d="M10 18.3334C14.6024 18.3334 18.3333 14.6024 18.3333 10C18.3333 5.39765 14.6024 1.66669 10 1.66669C5.39763 1.66669 1.66667 5.39765 1.66667 10C1.66667 14.6024 5.39763 18.3334 10 18.3334Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M10 6.66669V10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M10 13.3333H10.0083" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            </G>
        </Svg>
    );
}

function IconCompletado({ size, color, strokeWidth }: { size: number; color: string; strokeWidth: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
            <G>
                <Path d="M10 18.3334C14.6024 18.3334 18.3333 14.6024 18.3333 10C18.3333 5.39765 14.6024 1.66669 10 1.66669C5.39763 1.66669 1.66667 5.39765 1.66667 10C1.66667 14.6024 5.39763 18.3334 10 18.3334Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M13.3333 7.5L8.75001 12.0833L6.66667 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            </G>
        </Svg>
    );
}

function IconRetrasado({ size, color, strokeWidth }: { size: number; color: string; strokeWidth: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M12 2a10 10 0 0 1 7.38 16.75" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M12 6v6l4 2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M2.5 8.875a10 10 0 0 0-.5 3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M2.83 16a10 10 0 0 0 2.43 3.4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M4.636 5.235a10 10 0 0 1 .891-.857" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M8.644 21.42a10 10 0 0 0 7.631-.38" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function EstadoIcon({ estado, size = 20, strokeWidth = 2 }: Props) {
    const rotation = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;
    const shake = useRef(new Animated.Value(0)).current;
    const loopRef = useRef<Animated.CompositeAnimation | null>(null);

    const color = COLORS[estado] ?? '#D98E04';

    useEffect(() => {
        // Detener animación previa
        if (loopRef.current) {
            loopRef.current.stop();
            loopRef.current = null;
        }

        // Resetear valores
        rotation.setValue(0);
        pulse.setValue(1);
        shake.setValue(0);

        let animation: Animated.CompositeAnimation | null = null;

        if (estado === 'iniciar') {
            // Girar lento
            animation = Animated.loop(
                Animated.timing(rotation, {
                    toValue: 1,
                    duration: 2500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
        } else if (estado === 'en_progreso') {
            // Girar rápido
            animation = Animated.loop(
                Animated.timing(rotation, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
        } else if (estado === 'retrasada') {
            // Shake + pulse
            animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(shake, { toValue: 1, duration: 80, useNativeDriver: true }),
                    Animated.timing(shake, { toValue: -1, duration: 80, useNativeDriver: true }),
                    Animated.timing(shake, { toValue: 1, duration: 80, useNativeDriver: true }),
                    Animated.timing(shake, { toValue: 0, duration: 80, useNativeDriver: true }),
                    Animated.delay(1200),
                ])
            );
        } else if (estado === 'observada') {
            // Pulse fuerte
            animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, {
                        toValue: 1.25,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulse, {
                        toValue: 1,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
        } else if (estado === 'completado') {
            // Pulse suave (celebración)
            animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, {
                        toValue: 1.15,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulse, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.delay(1000),
                ])
            );
        }

        if (animation) {
            animation.start();
            loopRef.current = animation;
        }

        return () => {
            if (loopRef.current) {
                loopRef.current.stop();
                loopRef.current = null;
            }
        };
    }, [estado]);

    const rotateInterpolation = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const shakeInterpolation = shake.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-12deg', '12deg'],
    });

    // Transform según estado
    let transform: any[] = [];
    if (estado === 'iniciar' || estado === 'en_progreso') {
        transform = [{ rotate: rotateInterpolation }];
    } else if (estado === 'retrasada') {
        transform = [{ rotate: shakeInterpolation }];
    } else {
        transform = [{ scale: pulse }];
    }

    return (
        <Animated.View style={{ transform }}>
            {estado === 'retrasada' ? (
                <IconRetrasado size={size} color={color} strokeWidth={strokeWidth} />
            ) : estado === 'observada' ? (
                <IconObservado size={size} color={color} strokeWidth={strokeWidth} />
            ) : estado === 'completado' ? (
                <IconCompletado size={size} color={color} strokeWidth={strokeWidth} />
            ) : (
                <IconPendiente size={size} color={color} strokeWidth={strokeWidth} />
            )}
        </Animated.View>
    );
}