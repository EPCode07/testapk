import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type ZoomLevel = 0.5 | 1 | 2;

type Props = {
    zoom: ZoomLevel;
    onChange: (z: ZoomLevel) => void;
};

const OPTIONS: ZoomLevel[] = [0.5, 1, 2];

export default function ZoomSelector({ zoom, onChange }: Props) {
    return (
        <View style={styles.zoomContainer}>
            {OPTIONS.map((opt) => {
                const active = zoom === opt;
                return (
                    <TouchableOpacity
                        key={opt}
                        onPress={() => onChange(opt)}
                        style={styles.zoomOption}
                    >
                        <Text style={[styles.zoomText, active && styles.activeZoomText]}>
                            {opt}X
                        </Text>
                        {active && <View style={styles.zoomIndicatorBar} />}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    zoomContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: '#000000',
        gap: 40,
    },
    zoomOption: { alignItems: 'center' },
    zoomText: { color: '#888888', fontSize: 14, fontWeight: '600' },
    activeZoomText: { color: '#FFFFFF', fontWeight: 'bold' },
    zoomIndicatorBar: {
        height: 2,
        width: 24,
        backgroundColor: '#FFFFFF',
        marginTop: 4,
        borderRadius: 1,
    },
});