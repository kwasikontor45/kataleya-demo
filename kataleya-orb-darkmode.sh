#!/bin/bash
# kataleya-orb-darkmode.sh
# Run from: ~/kataleya
# 1. Move dark mode toggle to home screen header
# 2. Replace confusing GhostPulseOrb state label with human-readable context
# 3. Add orb tooltip that explains it on first view

set -e
APP="artifacts/kataleya-app"
echo "→ Applying orb + dark mode fixes..."

# ─────────────────────────────────────────────────────────────────────────────
# FIX 1 — Dark mode toggle on home screen header
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

path = pathlib.Path("artifacts/kataleya-app/app/(tabs)/index.tsx")
src = path.read_text()

# Add darkOverride to useCircadian destructure
old = "  const { theme, phase, phaseConfig } = useCircadian();"
new = "  const { theme, phase, phaseConfig, darkOverride, setDarkOverride } = useCircadian();"
if old in src: src = src.replace(old, new); print("  added darkOverride destructure")

# Add toggle between heartPill and CircadianBadge in header
old_badge = "          <CircadianBadge theme={theme} phaseConfig={phaseConfig} />"
new_badge = """          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setDarkOverride(!darkOverride)}
              style={[styles.darkToggle, {
                borderColor: `rgba(${accentRgb}, 0.28)`,
                backgroundColor: darkOverride ? `rgba(${accentRgb}, 0.1)` : 'transparent',
              }]}
              hitSlop={10}
            >
              <Text style={[styles.darkToggleIcon, { color: `rgba(${accentRgb}, ${darkOverride ? '0.9' : '0.45'})` }]}>
                {darkOverride ? '☀' : '◗'}
              </Text>
            </TouchableOpacity>
            <CircadianBadge theme={theme} phaseConfig={phaseConfig} />
          </View>"""

if old_badge in src and "headerRight" not in src:
    src = src.replace(old_badge, new_badge)
    print("  added dark toggle to header")

# Add styles
old_s = "  logoContainer:"
new_s = """  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  darkToggle: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  darkToggleIcon: { fontSize: 13, lineHeight: 15 },
  logoContainer:"""
if "darkToggle:" not in src and old_s in src:
    src = src.replace(old_s, new_s)
    print("  added darkToggle styles")

path.write_text(src)
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
# FIX 2 — GhostPulseOrb: replace confusing state label with human context
# "present · waiting" → human-readable explanation of what the orb shows
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

path = pathlib.Path("artifacts/kataleya-app/components/GhostPulseOrb.tsx")
src = path.read_text()

# Replace stageLabel function with more human-readable milestone descriptions
old_stage = """function stageLabel(daysSober: number): string {
  if (daysSober >= 365) return 'radiant';
  if (daysSober >= 180) return 'full bloom';
  if (daysSober >= 90)  return 'blooming';
  if (daysSober >= 30)  return 'opening';
  if (daysSober >= 14)  return 'reaching';
  if (daysSober >= 7)   return 'awakening';
  if (daysSober >= 1)   return 'beginning';
  return 'waiting';
}"""

new_stage = """// Human-readable recovery stage — shown below the orb
// Tells the user where they are in plain language
function stageLabel(daysSober: number): string {
  if (daysSober >= 365) return 'one full year of freedom';
  if (daysSober >= 180) return 'six months strong';
  if (daysSober >= 90)  return 'three months in';
  if (daysSober >= 30)  return 'one month forward';
  if (daysSober >= 14)  return 'two weeks of courage';
  if (daysSober >= 7)   return 'one week done';
  if (daysSober >= 1)   return 'your first day counts';
  return 'the garden is waiting for you';
}

// What the movement sensor shows — plain English
function restlessnessLabel(score: number): string {
  if (score > 0.7) return 'moving through it';
  if (score > 0.35) return 'some restlessness';
  return '';
}"""

if old_stage in src:
    src = src.replace(old_stage, new_stage)
    print("  updated stageLabel to human-readable")

# Replace the stateWord text display
# Old: systemState · stageLabel
# New: just stageLabel on first line, restlessness hint if moving
old_state_text = """      {/* System state word */}
      <Text style={[styles.stateWord, { color: `rgba(${rgb}, 0.5)` }]}>
        {systemState} · {stageLabel(daysSober)}
      </Text>"""

new_state_text = """      {/* Stage label — human readable recovery context */}
      <Text style={[styles.stageText, { color: `rgba(${rgb}, 0.55)` }]}>
        {stageLabel(daysSober)}
      </Text>
      {restlessnessScore > 0.35 && (
        <Text style={[styles.restlessText, { color: `rgba(${rgb}, 0.35)` }]}>
          {restlessnessLabel(restlessnessScore)}
        </Text>
      )}"""

if old_state_text in src:
    src = src.replace(old_state_text, new_state_text)
    print("  replaced stateWord with human stage label")

# Add new styles
old_style = "  stateWord: {"
new_style = """  stageText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 12,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  restlessText: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 3,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  stateWord: {"""

if "stageText:" not in src and old_style in src:
    src = src.replace(old_style, new_style)
    print("  added stageText styles")

path.write_text(src)
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
# FIX 3 — Add orb tooltip in index.tsx
# Appears briefly below the orb on first mount, fades out after 4s
# Explains: the orb grows with your recovery + responds to your movement
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

path = pathlib.Path("artifacts/kataleya-app/app/(tabs)/index.tsx")
src = path.read_text()

# Add orbHint animated value
old_refs = "  const dayPulse  = useRef(new Animated.Value(1)).current;"
new_refs = """  const dayPulse  = useRef(new Animated.Value(1)).current;
  // Orb tooltip — fades in, stays 5s, fades out
  const orbHint    = useRef(new Animated.Value(0)).current;"""

if "orbHint" not in src and old_refs in src:
    src = src.replace(old_refs, new_refs)

# Add orbHint fade-in/out effect after dayPulse effect
old_after = "  // Heart pill idle animation"
new_after = """  // Orb tooltip — brief introduction on mount
  useEffect(() => {
    Animated.sequence([
      Animated.delay(1200),
      Animated.timing(orbHint, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.delay(5000),
      Animated.timing(orbHint, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [orbHint]);

  // Heart pill idle animation"""

if "orbHint fade" not in src and "// Orb tooltip" not in src and old_after in src:
    src = src.replace(old_after, new_after)
    print("  added orbHint animation effect")

# Add the hint view below the GhostPulseOrb in the orbSection
old_orb_section = """        </View>

        {/* Timer */}"""

new_orb_section = """          {/* Orb tooltip — appears briefly, explains the visual */}
          <Animated.View style={[styles.orbHintWrap, { opacity: orbHint }]} pointerEvents="none">
            <Text style={[styles.orbHintText, { color: `${theme.textMuted}70` }]}>
              grows with your recovery · pulses with your body
            </Text>
          </Animated.View>
        </View>

        {/* Timer */}"""

if "orbHintWrap" not in src and old_orb_section in src:
    src = src.replace(old_orb_section, new_orb_section)
    print("  added orb tooltip view")

# Add orbHint styles
old_s = "  orbSection:"
new_s = """  orbHintWrap: { alignItems: 'center', marginTop: 4 },
  orbHintText: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  orbSection:"""

if "orbHintWrap:" not in src and old_s in src:
    src = src.replace(old_s, new_s)
    print("  added orbHint styles")

path.write_text(src)
print("  all index.tsx patches done")
PYEOF

echo ""
echo "✓ Done. Commit:"
echo "  git add -A && git commit -m 'fix: dark mode on home, orb human labels, orb tooltip' && git push origin main"
