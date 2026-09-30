import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { formatCoord, formatFechaHora, formatHeading } from '../lib/location/formatLocation';
import { DireccionInfo } from '../lib/location/reverseGeocode';

type Variant = 'watermark' | 'overlay';

interface Props {
    direccion: DireccionInfo | null;
    cargandoDireccion?: boolean;
    latitud?: number;
    longitud?: number;
    heading?: number | null;
    timestamp: string;
    variant?: Variant;
}

export default function WatermarkCard({
    direccion,
    cargandoDireccion = false,
    latitud,
    longitud,
    heading,
    timestamp,
    variant = 'overlay',
}: Props) {
    const isWatermark = variant === 'watermark';
    const { fecha, hora } = formatFechaHora(timestamp);

    return (
        <View style={[styles.card, isWatermark && styles.cardWatermark]}>
            {/* Mapa miniatura */}
            <ImageBackground
                source={require('../assets/images/mapa.png')}
                style={[styles.mapThumb, isWatermark && styles.mapThumbWatermark]}
                imageStyle={styles.mapThumbImage}
            >
                <View style={styles.mapPin} />
            </ImageBackground>

            {/* Columna 1: Dirección */}
            <View style={styles.column}>
                {cargandoDireccion ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <>
                        <Text
                            style={[styles.text, isWatermark && styles.textWatermark]}
                            numberOfLines={2}
                        >
                            {direccion?.nombre ?? 'Sin dirección'}
                        </Text>
                        <Text
                            style={[styles.text, isWatermark && styles.textWatermark]}
                            numberOfLines={1}
                        >
                            {direccion?.distrito ?? ''}
                        </Text>
                    </>
                )}
            </View>

            <View style={styles.divider} />

            {/* Columna 2: Coordenadas */}
            <View style={styles.column}>
                <Text style={[styles.text, isWatermark && styles.textWatermark]}>
                    <Text style={styles.bold}>Lat: </Text>
                    {latitud != null ? formatCoord(latitud, 'lat') : '--'}
                </Text>
                <Text style={[styles.text, isWatermark && styles.textWatermark]}>
                    <Text style={styles.bold}>Long: </Text>
                    {longitud != null ? formatCoord(longitud, 'lng') : '--'}
                </Text>
            </View>

            <View style={styles.divider} />

            {/* Columna 3: Heading + Fecha + Hora */}
            <View style={styles.column}>
                <View style={styles.metaRow}>
                    <Ionicons
                        name="compass-outline"
                        size={24}
                        color="#FFFFFF"
                    />
                    <Text style={[styles.text, isWatermark && styles.textWatermark]}>
                        {' '}{formatHeading(heading ?? null)}
                    </Text>
                </View>
                <View style={styles.metaRow}>
                    <Ionicons
                        name="calendar-outline"
                        size={24}
                        color="#FFFFFF"
                    />
                    <Text style={[styles.text, isWatermark && styles.textWatermark]}>
                        {' '}{fecha}
                    </Text>
                </View>
                <View style={styles.metaRow}>
                    <Ionicons
                        name="time-outline"
                        size={24}
                        color="#FFFFFF"
                    />
                    <Text style={[styles.text, isWatermark && styles.textWatermark]}>
                        {' '}{hora}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: 'rgba(10, 10, 10, 0.78)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        alignItems: 'center',
    },
    // WatermarkCard.tsx
    cardWatermark: {
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.45)',
        backgroundColor: 'rgba(10, 10, 10, 0.88)',
        maxWidth: 780,
        padding: 22,
        alignSelf: 'center',
    },
    mapThumb: {
        width: 44,
        height: 44,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapThumbWatermark: {
        width: 96,              // 👈 más grande
        height: 96,
        borderRadius: 12,
    },
    mapThumbImage: { borderRadius: 8 },
    mapPin: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#B5121B',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    column: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    divider: {
        width: 1,
        height: '70%',
        backgroundColor: 'rgba(255,255,255,0.25)',
        marginHorizontal: 4,
    },
    text: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-Regular',
        fontSize: 10,
        lineHeight: 14,
    },
    textWatermark: {
        fontSize: 20,           // 👈 más grande
        lineHeight: 28,
    },
    bold: {
        fontFamily: 'Poppins-Bold',
        fontWeight: 'bold',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});