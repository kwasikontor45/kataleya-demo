import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCircadian } from '@/hooks/useCircadian';
import { BurningRitual } from '@/components/BurningRitual';

export default function BurnScreen() {
  const router = useRouter();
  const { theme } = useCircadian();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <BurningRitual
        theme={theme}
        onComplete={() => router.replace('/(tabs)')}
        onCancel={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
