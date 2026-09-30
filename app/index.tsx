import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function Index() {
  useEffect(() => {
    router.replace('/login' as any);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6D0B10" />
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