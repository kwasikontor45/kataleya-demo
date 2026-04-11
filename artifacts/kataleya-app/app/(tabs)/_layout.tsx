import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform, View } from 'react-native';
import React from 'react';
import { useCircadian } from '@/hooks/useCircadian';
import { GlyphIcon } from '@/components/GlyphIcon';

function TabIcon({ name, color, size, focused, phaseRgb }: {
  name: string; color: string; size: number; focused: boolean; phaseRgb: string;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {focused && (
        <View style={{
          position: 'absolute',
          width: size * 2.4,
          height: size * 2.4,
          borderRadius: size * 1.2,
          backgroundColor: `rgba(${phaseRgb}, 0.1)`,
        }} />
      )}
      <GlyphIcon name={name} size={size} color={color} strokeWidth={focused ? 1.6 : 1.2} />
    </View>
  );
}

export default function TabLayout() {
  const { theme } = useCircadian();
  const isIOS    = Platform.OS === 'ios';
  const isWeb    = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';

  // Active = phase accent with glow. Inactive = near-invisible — present not competing.
  const tabActive   = theme.accent;
  const tabInactive = 'rgba(138,138,158,0.35)';

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
            borderTopColor: `rgba(${theme.phaseRgb}, 0.5)`,
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
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon name="orb" color={color} size={size} focused={focused} phaseRgb={theme.phaseRgb ?? '0,212,170'} />
            ),
          }}
        />
        <Tabs.Screen
          name="growth"
          options={{
            title: 'cycles',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon name="cycle" color={color} size={size} focused={focused} phaseRgb={theme.phaseRgb ?? '0,212,170'} />
            ),
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: 'journal',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon name="quill" color={color} size={size} focused={focused} phaseRgb={theme.phaseRgb ?? '0,212,170'} />
            ),
          }}
        />
        <Tabs.Screen
          name="vault"
          options={{
            title: 'vault',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon name="lock" color={color} size={size} focused={focused} phaseRgb={theme.phaseRgb ?? '0,212,170'} />
            ),
          }}
        />
        <Tabs.Screen
          name="sponsor"
          options={{
            title: 'signal',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon name="signal" color={color} size={size} focused={focused} phaseRgb={theme.phaseRgb ?? '0,212,170'} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
