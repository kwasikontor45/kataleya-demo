'use no memo';
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { ThemeTokens } from '@/constants/theme';

/**
 * NeonCard — base card component for the v2.4 UI redesign.
 *
 * Replaces plain View cards with a dark-surface card that carries
 * a colored glow accent. The color is set via the `accentRgb` prop
 * (RGB triplet string, e.g. "127,201,201") so intensity can be
 * controlled without re-specifying the color.
 *
 * Usage:
 *   <NeonCard accentRgb="127,201,201" theme={theme}>
 *     ...children
 *   </NeonCard>
 *
 *   <NeonCard accentRgb="155,109,255" theme={theme} onPress={fn}>
 *     ...children (pressable)
 *   </NeonCard>
 */

export type NeonGlowColor =
  | 'cyan'       // 127,201,201 — day / water / breathing
  | 'violet'     // 155,109,255 — night / grounding
  | 'amber'      // 232,197,106 — golden hour / light signal
  | 'pink'       // 208,96,122  — dawn
  | 'neutral';   // 255,255,255 — no tint

export const NEON_RGB: Record<NeonGlowColor, string> = {
  cyan:    '127,201,201',
  violet:  '155,109,255',
  amber:   '232,197,106',
  pink:    '208,96,122',
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
  borderIntensity?: number;  // 0–1, default 0.18
  fillIntensity?: number;    // 0–1, default 0.06
  disabled?: boolean;
}

export function NeonCard({
  children,
  theme,
  accentRgb,
  glowColor,
  onPress,
  onLongPress,
  style,
  borderIntensity = 0.18,
  fillIntensity = 0.06,
  disabled = false,
}: Props) {
  // Resolve RGB — explicit accentRgb wins, then glowColor lookup, then neutral
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
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        activeOpacity={0.75}
        style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}
