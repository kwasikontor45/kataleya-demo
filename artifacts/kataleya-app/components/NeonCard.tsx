'use no memo';
import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { ThemeTokens } from '@/constants/theme';

export type NeonGlowColor = 'cyan' | 'violet' | 'amber' | 'pink' | 'neutral';

// Scar Palette — Ouroboros Protocol
// cyan   = Choice Cyan    #00d4aa  clarity / breathing / mood / dawn-day
// violet = Resolve Violet #9b6dff  depth / journal / night / the self that survives
// amber  = Craving Amber  #ff6b35  desire / golden hour / urge / threshold
// pink   = Scar Red       #ff3366  burn / danger / the wound that becomes armor
// neutral = Scar Silver   #8a8a9e  past iterations, neutralised
export const NEON_RGB: Record<NeonGlowColor, string> = {
  cyan:    '0,212,170',
  violet:  '155,109,255',
  amber:   '255,107,53',
  pink:    '255,51,102',
  neutral: '138,138,158',
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
