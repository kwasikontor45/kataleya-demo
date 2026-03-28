import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { useCircadian } from '@/hooks/useCircadian';

export default function TabLayout() {
  const { theme, blend } = useCircadian();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';

  const isDark = blend >= 0.5;
  const statusBarStyle = isDark ? 'light' : 'dark';
  const blurTint = isDark ? 'dark' : 'light';

  // Tab icons get their own vivid palette so they're always readable.
  // Day (blend=0): deep burnt sienna active, warm walnut inactive.
  // Night (blend=1): theme accent / textMuted (already vivid on dark bg).
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const hexLerp = (dayHex: string, nightHex: string) => {
    const p = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const t = (c: [number, number, number]) => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
    const [dr, dg, db] = p(dayHex);
    const [nr, ng, nb] = p(nightHex);
    return t([lerp(dr, nr, blend), lerp(dg, ng, blend), lerp(db, nb, blend)]);
  };

  const tabActive   = hexLerp('#7a2200', theme.accent);
  const tabInactive = hexLerp('#5c3418', theme.textMuted);

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: tabActive,
          tabBarInactiveTintColor: tabInactive,
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: isIOS ? 'transparent' : theme.surface,
            borderTopColor: theme.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            elevation: isAndroid ? 8 : 0,
            height: isWeb ? 84 : 60,
            zIndex: 100,
          },
          tabBarLabelStyle: {
            fontFamily: 'CourierPrime',
            fontSize: 9,
            letterSpacing: 1,
            textTransform: 'lowercase',
            marginBottom: isWeb ? 8 : isAndroid ? 6 : 0,
          },
          tabBarIconStyle: {
            marginTop: isAndroid ? 6 : 0,
          },
          tabBarBackground: isIOS
            ? () => (
                <BlurView
                  intensity={80}
                  tint={blurTint}
                  style={StyleSheet.absoluteFill}
                />
              )
            : isWeb
            ? () => (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]} />
              )
            : undefined,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'sanctuary',
            tabBarIcon: ({ color, size }) => (
              <Feather name="circle" size={size - 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="growth"
          options={{
            title: 'growth',
            tabBarIcon: ({ color, size }) => (
              <Feather name="trending-up" size={size - 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: 'journal',
            tabBarIcon: ({ color, size }) => (
              <Feather name="edit-2" size={size - 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="vault"
          options={{
            title: 'vault',
            tabBarIcon: ({ color, size }) => (
              <Feather name="shield" size={size - 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="sponsor"
          options={{
            title: 'sponsor',
            tabBarIcon: ({ color, size }) => (
              <Feather name="heart" size={size - 2} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
