import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { getUsuario } from '../lib/user/userStorage';

export default function Index() {
  useEffect(() => {
    (async () => {
      const usuario = await getUsuario();
      if (usuario) {
        router.replace('/(tabs)' as any);
      } else {
        router.replace('/login' as any);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7A1C1C" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C8CDD0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});