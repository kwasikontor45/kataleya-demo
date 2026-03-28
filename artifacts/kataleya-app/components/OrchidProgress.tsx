'use no memo';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { ThemeTokens } from '@/constants/theme';

interface Props {
  theme: ThemeTokens;
  daysSober: number;
  progressToNext: number;
  swayX?: number;
  swayY?: number;
}

const W = 160;
const H = 200;
const CX = 80;
const STEM_BASE = 195;

// Single teardrop petal path, tip pointing to negative-Y from origin.
// Length ~40, half-width ~13 at midpoint.
const SEPAL_PATH = 'M 0,0 C -13,-8 -12,-28 0,-40 C 12,-28 13,-8 0,0';
// Rounder, shorter for inner petals
const PETAL_PATH = 'M 0,0 C -11,-6 -10,-22 0,-32 C 10,-22 11,-6 0,0';
// Wider lip petal pointing downward (used at 180°)
const LIP_PATH =
  'M 0,0 C -18,-6 -20,-22 -10,-34 C -4,-42 4,-42 10,-34 C 20,-22 18,-6 0,0';

// Bloom unfurls: each part unlocks at specific day thresholds
const PARTS = [
  // [pathKey, angle, opacity-when-locked, scale, partType]
  // first bloom (day 0+)
  { path: 'sepal', angle: 0,    day: 0,  scale: 1.0, type: 'sepal' },
  { path: 'sepal', angle: 130,  day: 0,  scale: 1.0, type: 'sepal' },
  { path: 'sepal', angle: -130, day: 0,  scale: 1.0, type: 'sepal' },
  { path: 'petal', angle: 65,   day: 0,  scale: 1.0, type: 'petal' },
  { path: 'petal', angle: -65,  day: 0,  scale: 1.0, type: 'petal' },
  { path: 'lip',   angle: 180,  day: 0,  scale: 1.0, type: 'lip'   },
  // second bloom (30+ days) higher up on stem
  { path: 'sepal', angle: 0,    day: 30, scale: 0.75, type: 'sepal' },
  { path: 'sepal', angle: 130,  day: 30, scale: 0.75, type: 'sepal' },
  { path: 'sepal', angle: -130, day: 30, scale: 0.75, type: 'sepal' },
  { path: 'petal', angle: 65,   day: 30, scale: 0.75, type: 'petal' },
  { path: 'petal', angle: -65,  day: 30, scale: 0.75, type: 'petal' },
  { path: 'lip',   angle: 180,  day: 30, scale: 0.75, type: 'lip'   },
];

function getPath(key: string) {
  if (key === 'sepal') return SEPAL_PATH;
  if (key === 'petal') return PETAL_PATH;
  return LIP_PATH;
}

function Petal({
  pathKey,
  angle,
  cx,
  cy,
  scale,
  accentColor,
  petalColor,
  lipColor,
  opacity,
  type,
}: {
  pathKey: string;
  angle: number;
  cx: number;
  cy: number;
  scale: number;
  accentColor: string;
  petalColor: string;
  lipColor: string;
  opacity: number;
  type: string;
}) {
  const fill = type === 'lip' ? lipColor : type === 'petal' ? petalColor : accentColor;
  return (
    <G
      transform={`translate(${cx},${cy}) rotate(${angle}) scale(${scale})`}
      opacity={opacity}
    >
      <Path d={getPath(pathKey)} fill={fill} />
    </G>
  );
}

export function OrchidProgress({ theme, daysSober, progressToNext, swayX = 0, swayY = 0 }: Props) {
  const bloomAnim = useRef(new Animated.Value(daysSober === 0 ? 0 : 1)).current;

  useEffect(() => {
    if (daysSober > 0) {
      Animated.timing(bloomAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [daysSober > 0]);

  // Stem height grows with days
  const stemH = Math.min(130, 30 + daysSober * 0.85);
  const stemTop = STEM_BASE - stemH;

  // First bloom center
  const bloom1Y = stemTop - 2;
  const bloom1X = CX;

  // Second bloom center (halfway up stem, offset slightly)
  const bloom2Y = stemTop + stemH * 0.45;
  const bloom2X = CX + 4;

  // Sway applied to the whole orchid group
  const swayDeg = swayX * 0.6;

  const accentColor = theme.accent;
  const petalColor = `${theme.accent}cc`;
  const lipColor = `${theme.accentSoft}`;

  // First bloom: progressToNext drives petal fill (0–1)
  // Each petal unlocks proportionally
  const FIRST_BLOOM_PARTS = PARTS.filter(p => p.day === 0);
  const SECOND_BLOOM_PARTS = PARTS.filter(p => p.day === 30);

  // opacity per first-bloom petal based on progress
  const firstBloomOpacity = daysSober === 0 ? 0.18 : 1;
  const secondBloomOpacity = daysSober >= 30 ? Math.min(1, (daysSober - 30) / 15) : 0;

  return (
    <View style={{ width: W, height: H }}>
      <Svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ transform: [{ rotate: `${swayDeg}deg` }, { translateY: swayY * 0.4 }] }}
      >
        {/* Stem */}
        <Path
          d={`M ${CX},${STEM_BASE} Q ${CX - 4},${stemTop + stemH * 0.5} ${CX},${stemTop}`}
          stroke={`${theme.accent}55`}
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
        />

        {/* Leaf (appears after day 7) */}
        {daysSober >= 7 && (
          <Path
            d={`M ${CX},${stemTop + stemH * 0.65} Q ${CX - 24},${stemTop + stemH * 0.52} ${CX - 30},${stemTop + stemH * 0.44}`}
            stroke={`${theme.accent}40`}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
            opacity={Math.min(1, (daysSober - 7) / 10)}
          />
        )}

        {/* First bloom petals */}
        {FIRST_BLOOM_PARTS.map((p, i) => (
          <Petal
            key={`f${i}`}
            pathKey={p.path}
            angle={p.angle}
            cx={bloom1X}
            cy={bloom1Y}
            scale={p.scale * (daysSober === 0 ? 0.65 : 1)}
            accentColor={accentColor}
            petalColor={petalColor}
            lipColor={lipColor}
            opacity={firstBloomOpacity}
            type={p.type}
          />
        ))}

        {/* First bloom center column */}
        <Circle cx={bloom1X} cy={bloom1Y} r={5} fill={theme.gold} opacity={daysSober === 0 ? 0.2 : 0.9} />
        <Circle cx={bloom1X} cy={bloom1Y} r={2.2} fill={theme.text} opacity={daysSober === 0 ? 0.15 : 0.85} />

        {/* Second bloom (30+ days) */}
        {daysSober >= 20 && secondBloomOpacity > 0 && (
          <>
            {SECOND_BLOOM_PARTS.map((p, i) => (
              <Petal
                key={`s${i}`}
                pathKey={p.path}
                angle={p.angle}
                cx={bloom2X}
                cy={bloom2Y}
                scale={p.scale}
                accentColor={accentColor}
                petalColor={petalColor}
                lipColor={lipColor}
                opacity={secondBloomOpacity}
                type={p.type}
              />
            ))}
            <Circle cx={bloom2X} cy={bloom2Y} r={3.8} fill={theme.gold} opacity={secondBloomOpacity * 0.9} />
            <Circle cx={bloom2X} cy={bloom2Y} r={1.8} fill={theme.text} opacity={secondBloomOpacity * 0.85} />
          </>
        )}

        {/* Pre-bloom bud dot */}
        {daysSober === 0 && (
          <Circle cx={bloom1X} cy={bloom1Y} r={4} fill={`${theme.accent}45`} />
        )}
      </Svg>
    </View>
  );
}
