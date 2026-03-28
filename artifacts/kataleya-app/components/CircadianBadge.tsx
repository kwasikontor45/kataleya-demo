import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeTokens } from '@/constants/theme';
import { PhaseConfig } from '@/constants/circadian';

interface Props {
  theme: ThemeTokens;
  phaseConfig: PhaseConfig;
}

export function CircadianBadge({ theme, phaseConfig }: Props) {
  return (
    <View style={[styles.badge, { borderColor: `${theme.accent}40` }]}>
      <Text style={[styles.name, { color: theme.accent }]}>
        {phaseConfig.displayName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  name: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
  },
});
