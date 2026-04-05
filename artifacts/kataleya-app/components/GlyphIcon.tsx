'use no memo';
/**
 * GlyphIcon — thin-line SVG icons for Kataleya.
 * No emojis. No raster. Pure paths, stroke-based, theme-colored.
 *
 * All icons are 20×20 viewBox, drawn at 1.5px stroke weight.
 * Use size prop to scale. Color defaults to current accent.
 *
 * Available icons:
 *   Milestone tiers:  seed · sprout · reach · leaf · branch · bloom · radiant · rooted · eternal
 *   Privacy/vault:    device · eye-off · lock · flame · rain · shield · key
 *   Mindfulness:      wave · ground
 *   Utility:          dot · star · circle-check
 */
import React from 'react';
import Svg, { Path, Circle, Line, Ellipse, G } from 'react-native-svg';

interface Props {
  name: GlyphName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export type GlyphName =
  // Milestone tiers — botanical progression
  | 'seed'       // day 1    · a single dot
  | 'sprout'     // 7 days   · two curved cotyledon lines rising from a point
  | 'reach'      // 14 days  · three vertical lines, tallest center
  | 'leaf'       // 30 days  · a simple ovoid leaf with midrib
  | 'branch'     // 90 days  · stem + two side branches
  | 'bloom'      // 180 days · four petals around a center
  | 'radiant'    // 1 year   · circle with 8 radiating lines (sun/star)
  | 'rooted'     // 2 years  · two concentric arcs + root lines below
  | 'eternal'    // 5 years  · triple concentric circles, thin
  // Privacy / vault
  | 'device'     // phone outline — data stays here
  | 'eye-off'    // crossed-out eye — no surveillance
  | 'lock'       // closed padlock
  | 'flame'      // burn ritual — three-curve flame
  | 'rain'       // three falling drops
  | 'shield'     // shield outline
  | 'key'        // key — fortress
  // Mindfulness
  | 'wave'       // single sine wave — breathe
  | 'ground'     // horizontal line + three rising vertical marks — grounding
  // Utility
  | 'dot'        // filled circle
  | 'star'       // four-point star ✦
  | 'check';     // simple checkmark

export function GlyphIcon({ name, size = 18, color = '#87a878', strokeWidth = 1.5 }: Props) {
  const s = strokeWidth;
  const c = color;

  const sharedProps = {
    fill: 'none' as const,
    stroke: c,
    strokeWidth: s,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const icon = (() => {
    switch (name) {

      // ── Milestone tiers ────────────────────────────────────────────────

      case 'seed':
        // Single filled circle — barely there, a seed in soil
        return <Circle cx="10" cy="13" r="2" fill={c} stroke="none" />;

      case 'sprout':
        // Two arcing cotyledons rising from a stem — first signs of life
        return <>
          <Path d="M10 17 L10 10" {...sharedProps} />
          <Path d="M10 12 Q7 9 5 10" {...sharedProps} />
          <Path d="M10 12 Q13 9 15 10" {...sharedProps} />
        </>;

      case 'reach':
        // Three vertical bars, tallest center — reaching upward
        return <>
          <Line x1="7"  y1="16" x2="7"  y2="10" {...sharedProps} />
          <Line x1="10" y1="16" x2="10" y2="7"  {...sharedProps} />
          <Line x1="13" y1="16" x2="13" y2="11" {...sharedProps} />
        </>;

      case 'leaf':
        // Ovoid leaf with a center midrib — established
        return <>
          <Path d="M10 16 Q5 12 6 7 Q10 4 14 7 Q15 12 10 16Z" {...sharedProps} />
          <Line x1="10" y1="16" x2="10" y2="7" {...sharedProps} strokeOpacity={0.5} />
        </>;

      case 'branch':
        // Vertical stem + two side branches — blooming
        return <>
          <Line x1="10" y1="17" x2="10" y2="5" {...sharedProps} />
          <Path d="M10 11 Q7 9 5 7" {...sharedProps} />
          <Path d="M10 11 Q13 9 15 7" {...sharedProps} />
          <Path d="M10 8 Q8 6 7 5" {...sharedProps} />
          <Path d="M10 8 Q12 6 13 5" {...sharedProps} />
        </>;

      case 'bloom':
        // Four petals around a center — full bloom
        return <>
          <Ellipse cx="10" cy="7"  rx="2" ry="3" {...sharedProps} />
          <Ellipse cx="10" cy="13" rx="2" ry="3" {...sharedProps} />
          <Ellipse cx="7"  cy="10" rx="3" ry="2" {...sharedProps} />
          <Ellipse cx="13" cy="10" rx="3" ry="2" {...sharedProps} />
          <Circle cx="10" cy="10" r="1.5" fill={c} stroke="none" />
        </>;

      case 'radiant':
        // Circle + 8 radiating lines — one full year
        return <>
          <Circle cx="10" cy="10" r="3" {...sharedProps} />
          {[0,45,90,135,180,225,270,315].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = 10 + Math.cos(rad) * 4.5;
            const y1 = 10 + Math.sin(rad) * 4.5;
            const x2 = 10 + Math.cos(rad) * 7;
            const y2 = 10 + Math.sin(rad) * 7;
            return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} {...sharedProps} />;
          })}
        </>;

      case 'rooted':
        // Two concentric arcs above + root lines below — deep roots
        return <>
          <Path d="M4 10 Q4 4 10 4 Q16 4 16 10" {...sharedProps} />
          <Path d="M6 12 Q6 7 10 7 Q14 7 14 12" {...sharedProps} strokeOpacity={0.6} />
          <Line x1="10" y1="13" x2="10" y2="18" {...sharedProps} />
          <Path d="M10 15 Q7 16 6 18" {...sharedProps} strokeOpacity={0.5} />
          <Path d="M10 15 Q13 16 14 18" {...sharedProps} strokeOpacity={0.5} />
        </>;

      case 'eternal':
        // Three concentric circles — five years, unbroken
        return <>
          <Circle cx="10" cy="10" r="8" {...sharedProps} strokeOpacity={0.3} />
          <Circle cx="10" cy="10" r="5" {...sharedProps} strokeOpacity={0.6} />
          <Circle cx="10" cy="10" r="2" {...sharedProps} />
        </>;

      // ── Privacy / vault ────────────────────────────────────────────────

      case 'device':
        // Phone outline — data stays on this device
        return <>
          <Path d="M7 3 Q5 3 5 5 L5 15 Q5 17 7 17 L13 17 Q15 17 15 15 L15 5 Q15 3 13 3 Z" {...sharedProps} />
          <Line x1="9" y1="15" x2="11" y2="15" {...sharedProps} />
        </>;

      case 'eye-off':
        // Eye with a diagonal strike — no surveillance
        return <>
          <Path d="M3 10 Q5 6 10 6 Q15 6 17 10 Q15 14 10 14 Q5 14 3 10Z" {...sharedProps} />
          <Circle cx="10" cy="10" r="2" {...sharedProps} />
          <Line x1="4" y1="4" x2="16" y2="16" {...sharedProps} stroke={c} strokeWidth={s * 1.1} />
        </>;

      case 'lock':
        // Closed padlock
        return <>
          <Ellipse cx="10" cy="8" rx="4" ry="4"
            {...sharedProps}
            style={{ clipPath: 'inset(50% 0 0 0)' }} />
          <Path d="M6 8 Q6 5 10 5 Q14 5 14 8" {...sharedProps} />
          <Path d="M6 10 L6 16 Q6 17 7 17 L13 17 Q14 17 14 16 L14 10 Z" {...sharedProps} />
          <Circle cx="10" cy="13" r="1" fill={c} stroke="none" />
          <Line x1="10" y1="13" x2="10" y2="15" {...sharedProps} strokeWidth={s * 0.8} />
        </>;

      case 'flame':
        // Burn ritual — organic flame shape
        return <>
          <Path d="M10 17 Q5 14 6 9 Q8 5 10 4 Q10 8 13 6 Q14 10 12 13 Q14 11 13 9 Q15 13 13 16 Q12 18 10 17Z"
            {...sharedProps} />
        </>;

      case 'rain':
        // Three falling raindrops
        return <>
          {[6, 10, 14].map((x, i) => (
            <G key={i}>
              <Path d={`M${x} ${7 + i * 2} Q${x} ${10 + i * 2} ${x - 1} ${11 + i * 2} Q${x} ${13 + i * 2} ${x + 1} ${11 + i * 2} Q${x} ${10 + i * 2} ${x} ${7 + i * 2}Z`}
                {...sharedProps} strokeWidth={s * 0.8} />
            </G>
          ))}
        </>;

      case 'shield':
        // Shield — protection
        return <>
          <Path d="M10 3 L16 6 L16 11 Q16 16 10 18 Q4 16 4 11 L4 6 Z" {...sharedProps} />
          <Path d="M7 10 L9 12 L13 8" {...sharedProps} />
        </>;

      case 'key':
        // Key — fortress / credentials
        return <>
          <Circle cx="7" cy="9" r="4" {...sharedProps} />
          <Line x1="11" y1="9" x2="18" y2="9" {...sharedProps} />
          <Line x1="15" y1="9" x2="15" y2="12" {...sharedProps} />
          <Line x1="17" y1="9" x2="17" y2="11" {...sharedProps} />
        </>;

      // ── Mindfulness ────────────────────────────────────────────────────

      case 'wave':
        // Sine wave — breathe / ocean
        return <Path
          d="M2 10 Q4 6 6 10 Q8 14 10 10 Q12 6 14 10 Q16 14 18 10"
          {...sharedProps}
        />;

      case 'ground':
        // Horizontal ground line + three rising marks — 5-4-3-2-1 grounding
        return <>
          <Line x1="3" y1="14" x2="17" y2="14" {...sharedProps} />
          <Line x1="7"  y1="14" x2="7"  y2="9"  {...sharedProps} />
          <Line x1="10" y1="14" x2="10" y2="6"  {...sharedProps} />
          <Line x1="13" y1="14" x2="13" y2="10" {...sharedProps} />
        </>;

      // ── Utility ───────────────────────────────────────────────────────

      case 'dot':
        return <Circle cx="10" cy="10" r="2.5" fill={c} stroke="none" />;

      case 'star':
        // Four-point star ✦
        return <Path
          d="M10 3 L11.2 8.8 L17 10 L11.2 11.2 L10 17 L8.8 11.2 L3 10 L8.8 8.8 Z"
          fill={c} stroke="none"
        />;

      case 'check':
        return <Path d="M4 10 L8 14 L16 6" {...sharedProps} />;

      default:
        return <Circle cx="10" cy="10" r="2" fill={c} stroke="none" />;
    }
  })();

  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {icon}
    </Svg>
  );
}

// Convenience: milestone tier → GlyphName
export function milestoneGlyph(days: number): GlyphName {
  if (days >= 1826) return 'eternal';   // 5 years
  if (days >= 730)  return 'rooted';    // 2 years
  if (days >= 365)  return 'radiant';   // 1 year
  if (days >= 180)  return 'bloom';     // 6 months
  if (days >= 90)   return 'branch';    // 3 months
  if (days >= 30)   return 'leaf';      // 1 month
  if (days >= 14)   return 'reach';     // 2 weeks
  if (days >= 7)    return 'sprout';    // 1 week
  return 'seed';                         // day 1
}
