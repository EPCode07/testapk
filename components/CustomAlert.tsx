import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
// Nota: Necesitarás una librería de iconos, ej. @expo/vector-icons para Expo, o react-native-vector-icons
// He usado Ionicons como ejemplo, pero puedes cambiarlo.
import { Ionicons } from '@expo/vector-icons';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    onClose: () => void;
    // Nuevo: Prop para aceptar una función al presionar "Aceptar"
    onAccept?: () => void;
    // Nuevo: Prop para la fuente del icono de la App
    appIconSource?: any; // Puede ser un require() o una uri
    appName: string;
}

export default function CustomAlert({
    visible,
    title,
    message,
    onClose,
    onAccept,
    appIconSource,
    appName
}: CustomAlertProps) {

    // Función combinada para el botón Aceptar
    const handleAccept = () => {
        if (onAccept) onAccept();
        onClose(); // Cierra el modal después de aceptar
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>

                    <View style={styles.headerContainer}>
                        <View style={styles.headerLeft}>
                            {appIconSource ? (
                                <Image source={appIconSource} style={styles.appIcon} />
                            ) : (
                                <View style={[styles.appIcon, { backgroundColor: '#ddd' }]} />
                            )}
                            <Text style={styles.appName}>{appName}</Text>
                        </View>

                        <View style={styles.headerRight}>
                            {/* Icono de alerta en vez de "now" */}
                            <Ionicons name="alert-circle" size={16} color="#ef4444" style={styles.alertIcon} />
                        </View>
                    </View>

                    {/* --- CUERPO --- */}
                    <View style={styles.bodyContainer}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <Text style={styles.modalDescription}>{message}</Text>
                    </View>

                    {/* --- BOTONES --- */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleAccept}>
                            <Text style={styles.acceptButtonText}>Aceptar</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Fondo oscuro para resaltar la alerta
        justifyContent: 'center', // <--- Cambiado de flex-start a center para que aparezca en medio
        alignItems: 'center',
        paddingHorizontal: 20, // Para que no pegue a los Lao de la pantalla
    },
    modalContent: {
        width: '100%',
        maxWidth: 340, // Un ancho máximo para que no se estire demasiado en tablets o pantallas grandes
        backgroundColor: '#ffffff',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
        overflow: 'hidden',
    },

    // Estilos de Cabecera
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    appIcon: {
        width: 24,
        height: 24,
        borderRadius: 6,
        marginRight: 8,
    },
    appName: {
        fontSize: 13,
        color: '#8e8e93',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertIcon: {
        marginRight: 4,
    },
    // Estilos de Cuerpo
    bodyContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 8,
        color: '#000',
    },
    modalDescription: {
        fontSize: 15,
        color: '#1c1c1e',
        lineHeight: 20,
    },

    // Estilos de Botones
    buttonContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        height: 50,
    },
    button: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        borderRightWidth: 1,
        borderRightColor: '#e0e0e0',
    },
    acceptButton: {
        backgroundColor: '#8B1E22',
        borderLeftWidth: 1,
        borderLeftColor: '#e0e0e0',
    },
    cancelButtonText: {
        fontSize: 17,
        color: '#8B1E22',
        fontWeight: '500',
    },
    acceptButtonText: {
        fontSize: 17,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});