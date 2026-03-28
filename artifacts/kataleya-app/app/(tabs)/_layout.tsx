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

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textMuted,
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
