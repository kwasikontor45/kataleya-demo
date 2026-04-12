import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Pressable } from 'react-native';
import React, { useState } from 'react';
import { useCircadian } from '@/hooks/useCircadian';
import { CRTScreen } from '@/components/CRTScreen';
import { TerminalNav } from '@/components/TerminalNav';
import { MercuryTabBar } from '@/components/MercuryTabBar';
import { NEON_RGB } from '@/components/NeonCard';
import * as Haptics from 'expo-haptics';

export default function TabLayout() {
  const { theme }   = useCircadian();
  const [phosphor, setPhosphor] = useState(false);

  const accentRgb = theme.phaseRgb ?? NEON_RGB.cyan;

  // Long press any droplet or thread → Phosphor Noir
  const togglePhosphor = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhosphor(p => !p);
  };

  if (phosphor) {
    return (
      <CRTScreen intensity="medium">
        <StatusBar style="light" hidden />
        <TerminalNav />
        {/* Long press bottom edge to exit Phosphor Noir */}
        <Pressable
          onLongPress={togglePhosphor}
          style={styles.phosphorExit}
          hitSlop={20}
        />
      </CRTScreen>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        tabBar={(props) => (
          <MercuryTabBar
            {...props}
            accentRgb={accentRgb}
            onLongPress={togglePhosphor}
          />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index"   options={{ title: 'garden'  }} />
        <Tabs.Screen name="growth"  options={{ title: 'cycles'  }} />
        <Tabs.Screen name="journal" options={{ title: 'journal' }} />
        <Tabs.Screen name="vault"   options={{ title: 'vault'   }} />
        <Tabs.Screen name="sponsor" options={{ title: 'signal'  }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  phosphorExit: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 200,
  },
});
