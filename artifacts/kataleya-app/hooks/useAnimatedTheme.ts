// hooks/useAnimatedTheme.ts
import { useEffect } from 'react';
import { useDerivedValue, useAnimatedStyle, interpolateColor, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCircadian } from './useCircadian';
import { getPhasePair, themeForPhase, ThemeTokens } from '@/constants/theme';

export function useAnimatedTheme() {
  const { blend, phase } = useCircadian();
  const blendValue = useSharedValue(blend);

  useEffect(() => {
    blendValue.value = withTiming(blend, { duration: 400 });
  }, [blend]);
  const [from, to] = getPhasePair(phase);

  const bg = useDerivedValue(() =>
    interpolateColor(blendValue.value, [0, 1], [from.bg, to.bg])
  );
  const surface = useDerivedValue(() =>
    interpolateColor(blendValue.value, [0, 1], [from.surface, to.surface])
  );
  const gold = useDerivedValue(() =>
    interpolateColor(blendValue.value, [0, 1], [from.gold, to.gold])
  );
  const accent = useDerivedValue(() =>
    interpolateColor(blendValue.value, [0, 1], [from.accent, to.accent])
  );
  const text = useDerivedValue(() =>
    interpolateColor(blendValue.value, [0, 1], [from.text, to.text])
  );
  const textMuted = useDerivedValue(() =>
    interpolateColor(blendValue.value, [0, 1], [from.textMuted, to.textMuted])
  );

  const bgStyle      = useAnimatedStyle(() => ({ backgroundColor: bg.value }));
  const surfaceStyle = useAnimatedStyle(() => ({ backgroundColor: surface.value }));
  const goldStyle    = useAnimatedStyle(() => ({ color: gold.value }));
  const accentStyle  = useAnimatedStyle(() => ({ color: accent.value }));
  const textStyle    = useAnimatedStyle(() => ({ color: text.value }));

  // Static snapshot for non-animated access (NeonCard, icons, etc.)
  const theme: ThemeTokens = themeForPhase(phase);

  return {
    colors: { bg, surface, gold, accent, text, textMuted },
    styles: {
      bg:      bgStyle,
      surface: surfaceStyle,
      gold:    goldStyle,
      accent:  accentStyle,
      text:    textStyle,
    },
    theme,
  };
}
