import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { proyectoService, SupervisorExterno } from '../lib/proyectos/proyectoService';
interface Props {
    visible: boolean;
    estacionId: number;
    onClose: () => void;
    onGuardadoExitoso: () => void;
}

export function ModalSupervisores({ visible, estacionId, onClose, onGuardadoExitoso }: Props) {
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [disponibles, setDisponibles] = useState<SupervisorExterno[]>([]);
    const [seleccionados, setSeleccionados] = useState<number[]>([]);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        if (!visible || !estacionId) return;

        let isMounted = true;

        const cargarDatos = async () => {
            if (isMounted) setCargando(true);

            try {
                const res = await proyectoService.obtenerSupervisores(estacionId);
                if (isMounted) {
                    setDisponibles(res.disponibles || []);
                    setSeleccionados(res.asignados || []);
                }
            } catch (error) {
                if (isMounted) {
                    setDisponibles([]);
                    setSeleccionados([]);
                }
            } finally {
                if (isMounted) setCargando(false);
            }
        };

        cargarDatos();

        return () => {
            isMounted = false;
        };
    }, [visible, estacionId]);


    const toggleSeleccion = (id: number) => {
        if (seleccionados.includes(id)) {
            setSeleccionados(seleccionados.filter(x => x !== id));
        } else {
            setSeleccionados([...seleccionados, id]);
        }
    };
    const handleGuardar = async () => {
        setGuardando(true);
        try {
            const res = await proyectoService.guardarSupervisores(estacionId, seleccionados);

            if (res.offline) {
                Alert.alert("Guardado local", "Sin internet. Se sincronizará al recuperar señal.");
            } else {
                Alert.alert("Éxito", "Supervisores actualizados.");
            }
            onGuardadoExitoso();
            onClose();
        } catch (error) {
            Alert.alert("Error", "Ocurrió un error inesperado.");
        } finally {
            setGuardando(false);
        }
    };
    const filtrados = disponibles.filter(s =>
        s.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
        (s.dni && s.dni.includes(busqueda))
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.headerModal}>
                        <Ionicons
                            name={'people'}
                            size={22}
                            color="#111827"
                        />
                        <Text style={styles.titulo}>Supervisores de Unidad</Text>
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Buscar por nombre o DNI..."
                        value={busqueda}
                        onChangeText={setBusqueda}
                    />

                    {cargando ? (
                        <ActivityIndicator size="large" color="#910E16" style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={filtrados}
                            keyExtractor={(item) => item.id.toString()}
                            style={{ maxHeight: 300 }}
                            renderItem={({ item }) => {
                                const isSelected = seleccionados.includes(item.id);
                                return (
                                    <TouchableOpacity
                                        style={[styles.itemFila, isSelected && styles.itemSeleccionado]}
                                        onPress={() => toggleSeleccion(item.id)}
                                    >
                                        <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
                                            {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                                        </View>
                                        <View>
                                            <Text style={styles.nombre}>{item.nombre_completo}</Text>
                                            <Text style={styles.cargo}>{item.cargo || 'Sin cargo'} - DNI: {item.dni || 'N/A'}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}

                    <View style={styles.acciones}>
                        <TouchableOpacity style={styles.btnCancelar} onPress={onClose} disabled={guardando}>
                            <Text style={styles.txtCancelar}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnGuardar} onPress={handleGuardar} disabled={guardando || cargando}>
                            <Text style={styles.txtGuardar}>{guardando ? "Guardando..." : "Guardar"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContainer: { backgroundColor: 'white', borderRadius: 12, padding: 20, elevation: 5 },
    headerModal: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 15,
    },
    titulo: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#333' },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15, fontFamily: 'Poppins-Regular' },
    itemFila: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    itemSeleccionado: { backgroundColor: '#fff0f1' },
    checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#ccc', borderRadius: 4, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
    checkboxOn: { backgroundColor: '#910E16', borderColor: '#910E16' },
    checkIcon: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    nombre: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#333' },
    cargo: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#666' },
    acciones: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
    btnCancelar: { padding: 10, paddingHorizontal: 20 },
    txtCancelar: { color: '#666', fontFamily: 'Poppins-SemiBold' },
    btnGuardar: { backgroundColor: '#910E16', padding: 10, paddingHorizontal: 20, borderRadius: 6 },
    txtGuardar: { color: 'white', fontFamily: 'Poppins-SemiBold' }
});