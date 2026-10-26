import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SugerenciaAvance = {
    es_multidia: boolean;
    es_extra: boolean;
    estado: string;
    avance_actual: number;
    dia_actual: number;
    dias_programados: number;
    sugerido: number; // 100 = ya toca completarla
};

type Props = {
    sugerencia: SugerenciaAvance | null;
    guardando: boolean;
    onGuardarAvance: (avance: number) => void;
    onCompletar: () => void;
    onCerrar: () => void; // "Ahora no": la evidencia ya quedó guardada
};

export default function AvanceSheet({ sugerencia, guardando, onGuardarAvance, onCompletar, onCerrar }: Props) {
    const insets = useSafeAreaInsets();

    const opciones = useMemo(() => {
        if (!sugerencia) return [];
        const base = [25, 50, 75, 90, sugerencia.sugerido < 100 ? sugerencia.sugerido : 0];
        return [...new Set(base)].filter((n) => n > sugerencia.avance_actual && n < 100).sort((a, b) => a - b);
    }, [sugerencia]);

    // Por defecto queda marcado el sugerido (salvo que ya toque completar)
    const [elegido, setElegido] = useState<number | null>(
        sugerencia && sugerencia.sugerido < 100 ? sugerencia.sugerido : null
    );

    if (!sugerencia) return null;
    const tocaCompletar = sugerencia.sugerido >= 100;

    const confirmarCompletar = () =>
        Alert.alert(
            'Completada al 100 %',
            'La actividad se dará por terminada y ya no se podrá seguir registrando avance.',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Completar', onPress: onCompletar },
            ]
        );

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onCerrar}>
            <View style={s.fondo}>
                <View style={[s.hoja, { paddingBottom: insets.bottom + 20 }]}>
                    <Text style={s.titulo}>¿Cuánto avance lleva?</Text>
                    <Text style={s.sub}>
                        Día {sugerencia.dia_actual} de {sugerencia.dias_programados} programados
                        {sugerencia.avance_actual > 0 ? ` · Llevaba ${sugerencia.avance_actual} %` : ''}
                    </Text>

                    {!tocaCompletar && (
                        <>
                            <Text style={s.sugerido}>
                                Sugerido: <Text style={s.sugeridoNum}>{sugerencia.sugerido} %</Text>
                            </Text>
                            <View style={s.chips}>
                                {opciones.map((n) => (
                                    <TouchableOpacity
                                        key={n}
                                        style={[s.chip, elegido === n && s.chipOn]}
                                        onPress={() => setElegido(n)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[s.chipTxt, elegido === n && s.chipTxtOn]}>{n} %</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity
                                style={[s.primario, (elegido === null || guardando) && { opacity: 0.5 }]}
                                disabled={elegido === null || guardando}
                                onPress={() => elegido !== null && onGuardarAvance(elegido)}
                                activeOpacity={0.85}
                            >
                                {guardando ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={s.primarioTxt}>Guardar avance{elegido !== null ? ` (${elegido} %)` : ''}</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}

                    {tocaCompletar && (
                        <Text style={s.aviso}>Se cumplieron los días programados. Si ya terminó, márcala como completada.</Text>
                    )}

                    <TouchableOpacity
                        style={[s.completar, tocaCompletar && s.completarFuerte, guardando && { opacity: 0.5 }]}
                        disabled={guardando}
                        onPress={confirmarCompletar}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="checkmark-done" size={18} color={tocaCompletar ? '#FFFFFF' : '#15803D'} />
                        <Text style={[s.completarTxt, tocaCompletar && { color: '#FFFFFF' }]}>Completada al 100 %</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onCerrar} style={s.ahoraNo} disabled={guardando}>
                        <Text style={s.ahoraNoTxt}>Ahora no</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    hoja: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
    titulo: { fontSize: 18, fontWeight: '700', color: '#111827' },
    sub: { fontSize: 13, color: '#6B7280' },
    sugerido: { fontSize: 14, color: '#374151' },
    sugeridoNum: { fontWeight: '800', color: '#B5121B' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: '#D1D5DB' },
    chipOn: { backgroundColor: '#B5121B', borderColor: '#B5121B' },
    chipTxt: { fontWeight: '600', color: '#374151' },
    chipTxtOn: { color: '#FFFFFF' },
    primario: { backgroundColor: '#B5121B', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    primarioTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    aviso: { fontSize: 14, color: '#374151' },
    completar: {
        flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
        borderRadius: 12, paddingVertical: 13, borderWidth: 1.5, borderColor: '#15803D',
    },
    completarFuerte: { backgroundColor: '#15803D' },
    completarTxt: { fontWeight: '700', color: '#15803D', fontSize: 15 },
    ahoraNo: { alignItems: 'center', paddingVertical: 8 },
    ahoraNoTxt: { color: '#6B7280', fontWeight: '600' },
});