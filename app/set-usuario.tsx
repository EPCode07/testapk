import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { getUsuario, setUsuario } from '../lib/user/userStorage';

export default function SetUsuarioScreen() {
    const [nombre, setNombre] = useState('');

    useEffect(() => {
        // Si ya hay un usuario guardado, precarga el campo (por si quiere cambiarlo)
        getUsuario().then((actual) => {
            if (actual) setNombre(actual);
        });
    }, []);

    const guardar = async () => {
        if (!nombre.trim()) return;
        await setUsuario(nombre.trim());
        router.back(); // o navega a donde corresponda después de guardar
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.label}>¿Cuál es tu nombre de usuario?</Text>
            <TextInput
                style={styles.input}
                placeholder="Ej: Juan Pérez"
                placeholderTextColor="#888"
                value={nombre}
                onChangeText={setNombre}
            />
            <TouchableOpacity style={styles.button} onPress={guardar}>
                <Text style={styles.buttonText}>Guardar</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', padding: 20, justifyContent: 'center' },
    label: { color: '#fff', fontSize: 16, marginBottom: 12 },
    input: {
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 16,
        height: 50,
        fontSize: 15,
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#8B1E24',
        height: 50,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});