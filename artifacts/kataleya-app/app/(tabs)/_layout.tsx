import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform, View, Pressable } from 'react-native';
import React, { useState } from 'react';
import { useCircadian } from '@/hooks/useCircadian';
import { GlyphIcon } from '@/components/GlyphIcon';
import { CRTScreen } from '@/components/CRTScreen';
import { TerminalNav } from '@/components/TerminalNav';
import * as Haptics from 'expo-haptics';

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
  const { theme }   = useCircadian();
  const isIOS       = Platform.OS === 'ios';
  const isWeb       = Platform.OS === 'web';
  const isAndroid   = Platform.OS === 'android';
  const [phosphor, setPhosphor] = useState(false);

  const tabActive   = theme.accent;
  const tabInactive = 'rgba(138,138,158,0.35)';

  // Long press tab bar border to toggle Phosphor Noir
  const togglePhosphor = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhosphor(p => !p);
  };

  if (phosphor) {
    return (
      <CRTScreen intensity="medium">
        <StatusBar style="light" hidden />
        <TerminalNav />
        {/* Exit hint — long press bottom edge to return */}
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
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor:   tabActive,
          tabBarInactiveTintColor: tabInactive,
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: isIOS ? 'transparent' : '#050508',
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
          // Long press the tab bar border line to enter Phosphor Noir
          tabBarButton: (props) => (
            <Pressable
              {...props}
              onLongPress={(e) => {
                if (props.onLongPress) props.onLongPress(e);
              }}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'garden',
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
      {/* Invisible long-press zone over the tab bar border to enter Phosphor Noir */}
      <Pressable
        onLongPress={togglePhosphor}
        style={styles.phosphorTrigger}
        hitSlop={10}
      />
    </>
  );
}

const styles = StyleSheet.create({
  phosphorTrigger: {
    position: 'absolute',
    bottom: 58,
    left: 0,
    right: 0,
    height: 4,
    zIndex: 200,
  },
  phosphorExit: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 200,
  },
});
