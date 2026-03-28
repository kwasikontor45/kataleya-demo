'use no memo';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { ThemeTokens } from '@/constants/theme';

interface Props {
  theme: ThemeTokens;
  daysSober: number;
  progressToNext: number;
  swayX?: number;
  swayY?: number;
}

const W = 200;
const H = 260;
const CX = 100;
const STEM_BASE = 252;

// ── Petal paths (larger, more botanical) ──────────────────────────────────────
// Sepal: slender elongated teardrop
const SEPAL_D = 'M 0,0 C -14,-10 -14,-34 0,-52 C 14,-34 14,-10 0,0';
// Inner petal: rounder, slightly shorter
const PETAL_D = 'M 0,0 C -12,-7 -12,-28 0,-42 C 12,-28 12,-7 0,0';
// Lip: wide ruffled lower petal (orchid labellum)
const LIP_D   = 'M 0,0 C -22,-8 -26,-28 -14,-44 C -7,-54 7,-54 14,-44 C 26,-28 22,-8 0,0';
// Petal vein — a faint mid-line
const VEIN_D  = 'M 0,-2 C 0,-14 0,-28 0,-40';
const SEPAL_VEIN_D = 'M 0,-2 C 0,-18 0,-36 0,-50';
// Column (central orchid structure)
const COL_D   = 'M 0,0 C -4,-3 -5,-10 -3,-18 C -1,-24 1,-24 3,-18 C 5,-10 4,-3 0,0';

// ── Bloom configuration ───────────────────────────────────────────────────────
const FIRST_BLOOM = [
  { d: 'sepal', angle: 0,    scale: 1.0, type: 'sepal' },
  { d: 'sepal', angle: 128,  scale: 1.0, type: 'sepal' },
  { d: 'sepal', angle: -128, scale: 1.0, type: 'sepal' },
  { d: 'petal', angle: 64,   scale: 1.0, type: 'petal' },
  { d: 'petal', angle: -64,  scale: 1.0, type: 'petal' },
  { d: 'lip',   angle: 180,  scale: 1.0, type: 'lip'   },
];
const SECOND_BLOOM = [
  { d: 'sepal', angle: 15,   scale: 0.72, type: 'sepal' },
  { d: 'sepal', angle: 140,  scale: 0.72, type: 'sepal' },
  { d: 'sepal', angle: -120, scale: 0.72, type: 'sepal' },
  { d: 'petal', angle: 72,   scale: 0.72, type: 'petal' },
  { d: 'petal', angle: -60,  scale: 0.72, type: 'petal' },
  { d: 'lip',   angle: 175,  scale: 0.72, type: 'lip'   },
];

function getD(key: string) {
  if (key === 'sepal') return SEPAL_D;
  if (key === 'petal') return PETAL_D;
  return LIP_D;
}
function getVein(key: string) {
  return key === 'sepal' ? SEPAL_VEIN_D : VEIN_D;
}

// ── Petal component ───────────────────────────────────────────────────────────
function Petal({
  pathKey, angle, cx, cy, scale, opacity, type,
  gradId, veinColor,
}: {
  pathKey: string; angle: number; cx: number; cy: number;
  scale: number; opacity: number; type: string;
  gradId: string; veinColor: string;
}) {
  return (
    <G transform={`translate(${cx},${cy}) rotate(${angle}) scale(${scale})`} opacity={opacity}>
      <Path d={getD(pathKey)} fill={`url(#${gradId})`} />
      <Path d={getVein(pathKey)} stroke={veinColor} strokeWidth={0.7} fill="none" opacity={0.4} />
      {type === 'lip' && (
        <>
          <Circle cx={-5} cy={-28} r={2.2} fill={veinColor} opacity={0.35} />
          <Circle cx={5}  cy={-28} r={2.2} fill={veinColor} opacity={0.35} />
          <Circle cx={0}  cy={-20} r={1.6} fill={veinColor} opacity={0.25} />
        </>
      )}
    </G>
  );
}

// ── Bloom component ───────────────────────────────────────────────────────────
function Bloom({
  parts, cx, cy, opacity,
  sepalGradId, petalGradId, lipGradId, colGradId,
  accentColor, glowColor,
}: {
  parts: typeof FIRST_BLOOM; cx: number; cy: number; opacity: number;
  sepalGradId: string; petalGradId: string; lipGradId: string; colGradId: string;
  accentColor: string; glowColor: string;
}) {
  if (opacity <= 0) return null;
  const veinColor = accentColor;
  return (
    <G opacity={opacity}>
      {/* Glow behind bloom */}
      <Circle cx={cx} cy={cy} r={36 * (parts[0].scale)} fill={`url(#${glowColor})`} opacity={0.35} />

      {parts.map((p, i) => {
        const gradId = p.type === 'lip' ? lipGradId : p.type === 'petal' ? petalGradId : sepalGradId;
        return (
          <Petal
            key={i}
            pathKey={p.d}
            angle={p.angle}
            cx={cx} cy={cy}
            scale={p.scale}
            opacity={1}
            type={p.type}
            gradId={gradId}
            veinColor={veinColor}
          />
        );
      })}

      {/* Center column */}
      <G transform={`translate(${cx},${cy - 4})`}>
        <Path d={COL_D} fill={`url(#${colGradId})`} />
      </G>

      {/* Anther cap (tip of column) */}
      <Circle cx={cx} cy={cy - 22} r={3.5} fill={accentColor} opacity={0.9} />
      <Circle cx={cx} cy={cy - 22} r={1.8} fill="#ffffff" opacity={0.6} />

      {/* Pollinarium glow dot */}
      <Circle cx={cx} cy={cy - 22} r={5.5} fill={accentColor} opacity={0.15} />
    </G>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function OrchidProgress({ theme, daysSober, progressToNext, swayX = 0, swayY = 0 }: Props) {
  const bloomAnim = useRef(new Animated.Value(daysSober > 0 ? 1 : 0)).current;

  useEffect(() => {
    if (daysSober > 0) {
      Animated.timing(bloomAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [daysSober > 0]);

  const stemH  = Math.min(148, 32 + daysSober * 0.9);
  const stemTop = STEM_BASE - stemH;

  const bloom1Y = stemTop - 2;
  const bloom1X = CX;

  const bloom2Y = stemTop + stemH * 0.42;
  const bloom2X = CX + 6;

  const swayDeg = swayX * 0.55;

  const acc  = theme.accent;                 // teal #7fc9c9
  const soft = theme.accentSoft;             // violet #9b6dff
  const gold = theme.gold ?? '#e8c56a';

  const firstBloomOpacity  = daysSober === 0 ? 0.14 : 1;
  const secondBloomOpacity = daysSober >= 20 ? Math.min(1, (daysSober - 20) / 18) : 0;

  // leaf opacities
  const leaf1Op = daysSober >= 7  ? Math.min(1, (daysSober - 7)  / 8) : 0;
  const leaf2Op = daysSober >= 18 ? Math.min(1, (daysSober - 18) / 12) : 0;
  const leaf3Op = daysSober >= 40 ? Math.min(1, (daysSober - 40) / 14) : 0;

  return (
    <View style={{ width: W, height: H }}>
      <Svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          transform: [
            { rotate: `${swayDeg}deg` },
            { translateY: swayY * 0.35 },
          ],
        }}
      >
        <Defs>
          {/* Sepal gradient: teal center → deeper teal edge */}
          <RadialGradient id="sepalGrad1" cx="40%" cy="50%" r="70%">
            <Stop offset="0%" stopColor={acc} stopOpacity="1" />
            <Stop offset="55%" stopColor={acc} stopOpacity="0.82" />
            <Stop offset="100%" stopColor={acc} stopOpacity="0.45" />
          </RadialGradient>
          {/* Petal gradient: violet → teal edge */}
          <RadialGradient id="petalGrad1" cx="40%" cy="50%" r="70%">
            <Stop offset="0%" stopColor={soft} stopOpacity="0.9" />
            <Stop offset="60%" stopColor={soft} stopOpacity="0.65" />
            <Stop offset="100%" stopColor={acc} stopOpacity="0.35" />
          </RadialGradient>
          {/* Lip gradient: gold base → pink */}
          <LinearGradient id="lipGrad1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={gold} stopOpacity="0.9" />
            <Stop offset="50%" stopColor={soft} stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#d0607a" stopOpacity="0.5" />
          </LinearGradient>
          {/* Column gradient */}
          <LinearGradient id="colGrad1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={gold} stopOpacity="1" />
            <Stop offset="100%" stopColor={acc} stopOpacity="0.7" />
          </LinearGradient>
          {/* Glow radial */}
          <RadialGradient id="glowGrad1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={acc} stopOpacity="0.55" />
            <Stop offset="100%" stopColor={acc} stopOpacity="0" />
          </RadialGradient>

          {/* Second bloom variants (slightly more violet-leaning) */}
          <RadialGradient id="sepalGrad2" cx="40%" cy="50%" r="70%">
            <Stop offset="0%" stopColor={soft} stopOpacity="0.9" />
            <Stop offset="60%" stopColor={acc}  stopOpacity="0.65" />
            <Stop offset="100%" stopColor={acc} stopOpacity="0.35" />
          </RadialGradient>
          <RadialGradient id="petalGrad2" cx="40%" cy="50%" r="70%">
            <Stop offset="0%" stopColor={soft} stopOpacity="0.85" />
            <Stop offset="60%" stopColor={soft} stopOpacity="0.55" />
            <Stop offset="100%" stopColor={acc} stopOpacity="0.25" />
          </RadialGradient>
          <LinearGradient id="lipGrad2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={gold} stopOpacity="0.8" />
            <Stop offset="60%" stopColor={soft} stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#d0607a" stopOpacity="0.4" />
          </LinearGradient>
          <LinearGradient id="colGrad2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={gold} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={soft} stopOpacity="0.5" />
          </LinearGradient>
          <RadialGradient id="glowGrad2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={soft} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={soft} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ── STEM ─────────────────────────────────────────────────────────── */}
        <Path
          d={`M ${CX},${STEM_BASE} Q ${CX - 5},${stemTop + stemH * 0.55} ${CX},${stemTop}`}
          stroke={acc + '60'}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
        {/* Stem highlight */}
        <Path
          d={`M ${CX + 0.5},${STEM_BASE - 10} Q ${CX - 4},${stemTop + stemH * 0.6} ${CX + 0.5},${stemTop + 8}`}
          stroke={acc + '28'}
          strokeWidth={1.0}
          fill="none"
          strokeLinecap="round"
        />

        {/* ── LEAVES ───────────────────────────────────────────────────────── */}
        {leaf1Op > 0 && (
          <G opacity={leaf1Op}>
            <Path
              d={`M ${CX},${stemTop + stemH * 0.72} Q ${CX - 28},${stemTop + stemH * 0.57} ${CX - 38},${stemTop + stemH * 0.46}`}
              stroke={acc + '58'}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M ${CX},${stemTop + stemH * 0.72} Q ${CX - 22},${stemTop + stemH * 0.62} ${CX - 34},${stemTop + stemH * 0.5}`}
              stroke={acc + '20'}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
            />
          </G>
        )}
        {leaf2Op > 0 && (
          <G opacity={leaf2Op}>
            <Path
              d={`M ${CX},${stemTop + stemH * 0.44} Q ${CX + 30},${stemTop + stemH * 0.3} ${CX + 40},${stemTop + stemH * 0.2}`}
              stroke={acc + '4a'}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M ${CX},${stemTop + stemH * 0.44} Q ${CX + 24},${stemTop + stemH * 0.35} ${CX + 36},${stemTop + stemH * 0.24}`}
              stroke={acc + '1a'}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          </G>
        )}
        {leaf3Op > 0 && (
          <G opacity={leaf3Op}>
            <Path
              d={`M ${CX},${stemTop + stemH * 0.58} Q ${CX - 18},${stemTop + stemH * 0.7} ${CX - 10},${stemTop + stemH * 0.86}`}
              stroke={acc + '38'}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />
          </G>
        )}

        {/* ── SECOND BLOOM (30+ days) ───────────────────────────────────────── */}
        <Bloom
          parts={SECOND_BLOOM}
          cx={bloom2X} cy={bloom2Y}
          opacity={secondBloomOpacity}
          sepalGradId="sepalGrad2"
          petalGradId="petalGrad2"
          lipGradId="lipGrad2"
          colGradId="colGrad2"
          accentColor={soft}
          glowColor="glowGrad2"
        />

        {/* ── FIRST BLOOM ──────────────────────────────────────────────────── */}
        <Bloom
          parts={FIRST_BLOOM}
          cx={bloom1X} cy={bloom1Y}
          opacity={firstBloomOpacity}
          sepalGradId="sepalGrad1"
          petalGradId="petalGrad1"
          lipGradId="lipGrad1"
          colGradId="colGrad1"
          accentColor={acc}
          glowColor="glowGrad1"
        />

        {/* ── PRE-BLOOM BUD ─────────────────────────────────────────────────── */}
        {daysSober === 0 && (
          <G>
            <Ellipse cx={bloom1X} cy={bloom1Y} rx={5} ry={8} fill={acc + '30'} />
            <Ellipse cx={bloom1X} cy={bloom1Y} rx={3} ry={5} fill={acc + '60'} />
          </G>
        )}
      </Svg>
    </View>
  );
}
