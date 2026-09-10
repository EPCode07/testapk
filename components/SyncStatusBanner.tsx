import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSync } from '../lib/sync/SyncContext';

export default function SyncStatusBanner() {
  const { isSyncing, isOnline, pendingCount } = useSync();

  const showOfflineBanner = !isOnline && pendingCount > 0;
  if (!isSyncing && !showOfflineBanner) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {isSyncing ? (
        <>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.text}>Sincronizando con Drive...</Text>
        </>
      ) : (
        <Text style={styles.text}>
          Sin conexión · {pendingCount} foto(s) por subir
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#8B1E22',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
