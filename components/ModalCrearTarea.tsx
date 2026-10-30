import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { tareasStorage } from '../lib/actividades/tareasStorage';
import { useSync } from '../lib/sync/SyncContext';


const OPCIONES_PREDEFINIDAS = [
    "Voltaje pila (3 vdc mín)",
    "Voltaje capacitor (2.8 vdc mín)",
    "Presión de aire baja",
    "Fuga de agua",
    "Temperatura elevada",
    "Otro (Escribir manual)"
];

const UNIDADES = ["V", "ml", "cm", "psi", "A", "°C", "%", "N/A"];

interface Props {
    visible: boolean;
    proyectoId: number;
    estacionId: number;
    estacionServicioId: number;
    descripcionBase?: string;
    onClose: () => void;
    onGuardadoExitoso: () => void;
}

export function ModalCrearTarea({
    visible, proyectoId, estacionId, estacionServicioId, descripcionBase, onClose, onGuardadoExitoso
}: Props) {
    const [seleccion, setSeleccion] = useState(OPCIONES_PREDEFINIDAS[0]);
    const [nombreManual, setNombreManual] = useState('');
    const [valor, setValor] = useState('');
    const [unidad, setUnidad] = useState(UNIDADES[0]);
    const [descripcion, setDescripcion] = useState(descripcionBase || '');
    const [guardando, setGuardando] = useState(false);
    const { syncTareasNow } = useSync();

    const [showOpciones, setShowOpciones] = useState(false);
    const [showUnidades, setShowUnidades] = useState(false);

    const limpiarFormulario = () => {
        setSeleccion(OPCIONES_PREDEFINIDAS[0]);
        setNombreManual('');
        setValor('');
        setUnidad(UNIDADES[0]);
        setDescripcion(descripcionBase || '');
    };

    const handleGuardar = async () => {
        const nombreFinal = seleccion === "Otra observación (Escribir manualmente)"
            ? nombreManual.trim()
            : seleccion;

        if (!nombreFinal) {
            return Alert.alert("Atención", "Debes seleccionar o escribir una observación.");
        }

        setGuardando(true);
        try {
            const valorStr = valor.trim() ? `${valor.trim()} ${unidad}` : '';
            const descripcionFinal = `${descripcion} - ${valorStr} `.trim();

            await tareasStorage.encolar({
                proyectoId,
                estacionId,
                estacionServicioId,
                nombre: nombreFinal,
                descripcion: descripcionFinal,
            });

            await syncTareasNow();

            const pendientes = await tareasStorage.listar();

            limpiarFormulario();

            if (pendientes.length === 0) {
                Alert.alert("Éxito", "Tarea enviada al servidor correctamente.");
            } else {
                Alert.alert("Aviso", "Guardado local. Se enviará cuando haya conexión.");
            }

            onGuardadoExitoso();
            onClose();
        } catch (error) {
            Alert.alert("Error", "No se pudo guardar la tarea.");
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.header}>
                            <Ionicons name="add-circle" size={24} color="#910E16" />
                            <Text style={styles.titulo}>Crear Tarea de Observación</Text>
                        </View>

                        <Text style={styles.label}>¿Qué se observó?</Text>
                        <TouchableOpacity
                            style={styles.selector}
                            onPress={() => setShowOpciones(!showOpciones)}
                        >
                            <Text style={styles.selectorText} numberOfLines={1}>{seleccion}</Text>
                            <Ionicons name="chevron-down" size={20} color="#666" />
                        </TouchableOpacity>

                        {showOpciones && (
                            <View style={styles.dropdown}>
                                {OPCIONES_PREDEFINIDAS.map((op, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setSeleccion(op);
                                            setShowOpciones(false);
                                        }}
                                    >
                                        <Text style={styles.dropdownText} numberOfLines={1}>{op}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {seleccion === "Otra observación (Escribir manualmente)" && (
                            <TextInput
                                style={styles.input}
                                placeholder="Escribe la observación..."
                                value={nombreManual}
                                onChangeText={setNombreManual}
                            />
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Valor (Opcional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: 2.8"
                                    keyboardType="numeric"
                                    value={valor}
                                    onChangeText={setValor}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Unidad</Text>
                                <TouchableOpacity
                                    style={styles.selector}
                                    onPress={() => setShowUnidades(!showUnidades)}
                                >
                                    <Text style={styles.selectorText}>{unidad}</Text>
                                    <Ionicons name="chevron-down" size={20} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {showUnidades && (
                            <View style={styles.dropdown}>
                                {UNIDADES.map((u, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setUnidad(u);
                                            setShowUnidades(false);
                                        }}
                                    >
                                        <Text style={styles.dropdownText}>{u}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <Text style={[styles.label, { marginTop: 15 }]}>Detalles adicionales</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe el problema..."
                            value={descripcion}
                            onChangeText={setDescripcion}
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.acciones}>
                            <TouchableOpacity style={styles.btnCancelar} onPress={onClose} disabled={guardando}>
                                <Text style={styles.txtCancelar}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnGuardar} onPress={handleGuardar} disabled={guardando}>
                                <Text style={styles.txtGuardar}>{guardando ? "Guardando..." : "Guardar Tarea"}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
    modalContainer: { backgroundColor: 'white', borderRadius: 12, padding: 16, maxHeight: '90%' },

    header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    titulo: { fontSize: 14, fontFamily: 'Poppins-Bold', color: '#333', flex: 1 },

    label: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#4B5563', marginBottom: 4 },

    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 10,
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginBottom: 8,
        backgroundColor: '#F9FAFB'
    },
    textArea: { height: 70, textAlignVertical: 'top' },

    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#F9FAFB'
    },
    selectorText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#111827', flex: 1 },

    dropdown: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        marginTop: 4,
        backgroundColor: '#FFFFFF',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    dropdownText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#374151' },

    acciones: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 10 },
    btnCancelar: { paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center' },
    txtCancelar: { color: '#6B7280', fontFamily: 'Poppins-SemiBold', fontSize: 14 },
    btnGuardar: { backgroundColor: '#910E16', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
    txtGuardar: { color: 'white', fontFamily: 'Poppins-SemiBold', fontSize: 14 }
});