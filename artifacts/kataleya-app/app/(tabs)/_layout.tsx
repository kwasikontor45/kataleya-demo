import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform, View } from 'react-native';
import React from 'react';
import { useCircadian } from '@/hooks/useCircadian';
import { GlyphIcon } from '@/components/GlyphIcon';

export default function TabLayout() {
  const { theme } = useCircadian();
  const isIOS    = Platform.OS === 'ios';
  const isWeb    = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';

  // Active = phase accent. Inactive = Scar Silver — past iterations, neutralised.
  const tabActive   = theme.accent;
  const tabInactive = '#8a8a9e';

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor:   tabActive,
          tabBarInactiveTintColor: tabInactive,
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: isIOS ? 'transparent' : '#050508',
            // Phase-colored top border — the signal line
            borderTopColor: `rgba(${theme.phaseRgb}, 0.35)`,
            borderTopWidth: 1,
            elevation: 0,
            height: isWeb ? 84 : 60,
            zIndex: 100,
          },
          tabBarLabelStyle: {
            fontFamily: 'SpaceMono',
            fontSize: 9,
            letterSpacing: 1.5,
            textTransform: 'lowercase',
            marginBottom: isWeb ? 8 : isAndroid ? 6 : 0,
          },
          tabBarIconStyle: {
            marginTop: isAndroid ? 6 : 0,
          },
          tabBarBackground: isIOS
            ? () => (
                <BlurView
                  intensity={60}
                  tint="dark"
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: 'rgba(5,5,8,0.7)' },
                  ]}
                />
              )
            : isWeb
            ? () => (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050508' }]} />
              )
            : undefined,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'sanctuary',
            tabBarIcon: ({ color, size }) => (
              <GlyphIcon name="orb" size={size} color={color} strokeWidth={1.3} />
            ),
          }}
        />
        <Tabs.Screen
          name="growth"
          options={{
            title: 'cycles',
            tabBarIcon: ({ color, size }) => (
              <GlyphIcon name="cycle" size={size} color={color} strokeWidth={1.3} />
            ),
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: 'journal',
            tabBarIcon: ({ color, size }) => (
              <GlyphIcon name="quill" size={size} color={color} strokeWidth={1.3} />
            ),
          }}
        />
        <Tabs.Screen
          name="vault"
          options={{
            title: 'vault',
            tabBarIcon: ({ color, size }) => (
              <GlyphIcon name="lock" size={size} color={color} strokeWidth={1.3} />
            ),
          }}
        />
        <Tabs.Screen
          name="sponsor"
          options={{
            title: 'signal',
            tabBarIcon: ({ color, size }) => (
              <GlyphIcon name="signal" size={size} color={color} strokeWidth={1.3} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
