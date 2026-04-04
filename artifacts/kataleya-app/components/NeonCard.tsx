'use no memo';
import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { ThemeTokens } from '@/constants/theme';

export type NeonGlowColor = 'cyan' | 'violet' | 'amber' | 'pink' | 'neutral';

// Organic palette — merged from HTML prototype
// cyan   = sage    #87a878  day / water / breathing / mood
// violet = terra   #d4a373  golden hour / journal / light signal
// amber  = safe    #81b29a  Fortress vault / grounding
// pink   = coral   #e07a5f  dawn / burn / danger-adjacent
export const NEON_RGB: Record<NeonGlowColor, string> = {
  cyan:    '135,168,120',
  violet:  '212,163,115',
  amber:   '129,178,154',
  pink:    '224,122,95',
  neutral: '255,255,255',
};

interface Props {
  children: React.ReactNode;
  theme: ThemeTokens;
  accentRgb?: string;
  glowColor?: NeonGlowColor;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  borderIntensity?: number;
  fillIntensity?: number;
  disabled?: boolean;
}

export function NeonCard({
  children, theme, accentRgb, glowColor, onPress, onLongPress,
  style, borderIntensity = 0.18, fillIntensity = 0.06, disabled = false,
}: Props) {
  const rgb = accentRgb ?? (glowColor ? NEON_RGB[glowColor] : NEON_RGB.neutral);
  const cardStyle: ViewStyle = {
    backgroundColor: `rgba(${rgb}, ${fillIntensity})`,
    borderWidth: 1,
    borderColor: `rgba(${rgb}, ${borderIntensity})`,
    borderRadius: 16,
    overflow: 'hidden',
  };
  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        onPress={onPress} onLongPress={onLongPress}
        disabled={disabled} activeOpacity={0.75} style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[cardStyle, style]}>{children}</View>;
}
