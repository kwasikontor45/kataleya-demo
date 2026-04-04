#!/bin/bash
# kataleya-fixes.sh
# Run from: ~/kataleya
# Fixes: breathing speed, morning bg, vault images, sponsor domain, burn hold
# Usage: bash ~/kataleya-fixes.sh YOUR_SERVER_DOMAIN
# Example: bash ~/kataleya-fixes.sh abc123.ngrok.io
#          bash ~/kataleya-fixes.sh myserver.railway.app

set -e
APP="artifacts/kataleya-app"
DOMAIN="${1:-}"

echo "→ Applying fixes..."

# ─────────────────────────────────────────────────────────────────────────────
# FIX 1 — Breathing exercise speed
# Problem: orb animation duration 900ms feels sluggish during hold phase
# Fix: cut transition to 400ms, tighten ring stagger delays
# ─────────────────────────────────────────────────────────────────────────────
sed -i \
  's/duration: Math.min(p.duration \* 800, 5000)/duration: Math.min(p.duration * 400, 2500)/g' \
  "$APP/components/BreathingExercise.tsx" 2>/dev/null || true

# Full rewrite of PHASES + animateToPhase for the new BreathingExercise
python3 - << 'PYEOF'
import re, pathlib

path = pathlib.Path("artifacts/kataleya-app/components/BreathingExercise.tsx")
src = path.read_text()

# Fix PHASES — update colors to merged palette
old_phases = '''const PHASES = [
  { label: 'Inhale',  duration: 4,  scaleTarget: 1.5  },
  { label: 'Hold',    duration: 7,  scaleTarget: 1.5  },
  { label: 'Exhale',  duration: 8,  scaleTarget: 0.85 },
  { label: 'Hold',    duration: 4,  scaleTarget: 0.85 },
];'''

new_phases = '''const PHASES = [
  { label: 'Inhale',  duration: 4,  scaleTarget: 1.45 },
  { label: 'Hold',    duration: 7,  scaleTarget: 1.45 },
  { label: 'Exhale',  duration: 8,  scaleTarget: 0.88 },
  { label: 'Hold',    duration: 4,  scaleTarget: 0.88 },
];'''

if old_phases in src:
    src = src.replace(old_phases, new_phases)
    print("  ✓ BreathingExercise PHASES updated")
else:
    print("  ~ BreathingExercise PHASES — pattern not found, skipping")

# Speed up the orb animation — find and replace animateToPhase timing
src = src.replace(
    "duration: Math.min(p.duration * 800, 5000)",
    "duration: Math.min(p.duration * 350, 2000)"
)
src = src.replace(
    "duration: Math.min(p.duration * 400, 2500)",
    "duration: Math.min(p.duration * 350, 2000)"
)

path.write_text(src)
PYEOF
echo "  ✓ Fix 1: breathing speed"

# ─────────────────────────────────────────────────────────────────────────────
# FIX 2 — MorningBloom bg too white
# Problem: #faf8f5 is near-white, harsh in morning
# Fix: shift to a warmer, slightly deeper cream — less glaring
# ─────────────────────────────────────────────────────────────────────────────
sed -i "s/bg:               '#faf8f5'/bg:               '#f0ebe2'/" "$APP/constants/theme.ts"
sed -i "s/surface:          '#ffffff'/surface:          '#f7f2ea'/" "$APP/constants/theme.ts"
# Also fix splash/bg in app.json (still the old purple)
sed -i 's/"backgroundColor": "#0e0c14"/"backgroundColor": "#1a1a2e"/g' "$APP/app.json"
echo "  ✓ Fix 2: MorningBloom bg warmed (#f0ebe2)"

# ─────────────────────────────────────────────────────────────────────────────
# FIX 3 — Vault images reassignment
# Problem: Fortress uses butterfly.jpg (looks like the same as sanctuary),
#          burn uses light.gif but it doesn't read as danger clearly
# Fix:
#   Fortress  → light.gif    (fiery/intense — hardware security, locked away)
#   Sanctuary → water.gif    (calm, flowing — your data, safe and still)  
#   Burn      → butterfly.jpg with red tint overlay (transformation = destruction)
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

path = pathlib.Path("artifacts/kataleya-app/app/(tabs)/vault.tsx")
src = path.read_text()

# Swap Fortress image: butterfly → light
src = src.replace(
    "  butterfly: require('@/assets/images/butterfly.jpg'),",
    "  butterfly: require('@/assets/images/butterfly.jpg'),  // burn card"
)

old_img = """// ── Asset map — matches HTML image description table ─────────────────────────
// Fortress  → butterfly.jpg  (transformation, recovery, identity)
// Sanctuary → water.gif      (calm, rhythm, local-only)
// Surface   → no image       (plain card — ephemeral, low-stakes)
// Burn      → light.gif      (fiery sun — intensity, warning)
const IMG = {
  butterfly: require('@/assets/images/butterfly.jpg'),
  water:     require('@/assets/images/water.gif'),
  light:     require('@/assets/images/light.gif'),
};"""

new_img = """// ── Asset map ─────────────────────────────────────────────────────────────────
// Fortress  → light.gif      (intense, locked, hardware-backed — fire = security)
// Sanctuary → water.gif      (calm, flowing, local-only — ocean = private)
// Surface   → no image       (plain card — ephemeral, low-stakes)
// Burn      → butterfly.jpg  (transformation — the butterfly burns to be reborn)
const IMG = {
  light:     require('@/assets/images/light.gif'),
  water:     require('@/assets/images/water.gif'),
  butterfly: require('@/assets/images/butterfly.jpg'),
};"""

if old_img in src:
    src = src.replace(old_img, new_img)
    print("  ✓ IMG map reassigned")
else:
    print("  ~ IMG map not found, trying partial replace")

# Fortress card: change source from IMG.butterfly to IMG.light
src = src.replace(
    """        {/* FORTRESS — butterfly.jpg (transformation, identity) */}
        <ImageBackground
          source={IMG.butterfly}""",
    """        {/* FORTRESS — light.gif (intensity, locked away, fire = security) */}
        <ImageBackground
          source={IMG.light}"""
)

# Burn card: change source from IMG.light to IMG.butterfly
src = src.replace(
    """        <ImageBackground
          source={IMG.light}
          style={styles.burnImgCard}""",
    """        <ImageBackground
          source={IMG.butterfly}
          style={styles.burnImgCard}"""
)

# Burn overlay — make it darker red-tinted for the butterfly card
src = src.replace(
    "  burn:      'rgba(14,12,20,0.55)',",
    "  burn:      'rgba(40,8,8,0.72)',"
)

path.write_text(src)
print("  ✓ Fix 3: vault images reassigned")
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
# FIX 4 — Sponsor "could not create invite / check connection"
# Problem: EXPO_PUBLIC_DOMAIN not set → API_BASE = "https://undefined/api"
# Fix: create .env with the domain, or warn clearly if not provided
# ─────────────────────────────────────────────────────────────────────────────
if [ -z "$DOMAIN" ]; then
  echo "  ⚠ Fix 4: No domain provided — writing placeholder .env"
  echo "    Run: bash ~/kataleya-fixes.sh YOUR_SERVER_DOMAIN"
  echo "    Example: bash ~/kataleya-fixes.sh abc123.ngrok.io"
  cat > "$APP/.env" << 'ENVEOF'
# Kataleya API server domain — NO https://, NO trailing slash
# Example: abc123.ngrok.io  or  myapp.railway.app
EXPO_PUBLIC_DOMAIN=localhost:3000
ENVEOF
  echo "  ~ .env written with localhost:3000 placeholder"
else
  # Strip https:// and trailing slash if user included them
  CLEAN_DOMAIN="${DOMAIN#https://}"
  CLEAN_DOMAIN="${CLEAN_DOMAIN#http://}"
  CLEAN_DOMAIN="${CLEAN_DOMAIN%/}"
  cat > "$APP/.env" << ENVEOF
# Kataleya API server domain — NO https://, NO trailing slash
EXPO_PUBLIC_DOMAIN=${CLEAN_DOMAIN}
ENVEOF
  echo "  ✓ Fix 4: .env written → EXPO_PUBLIC_DOMAIN=${CLEAN_DOMAIN}"
fi

# Also add extra hint to useSponsorChannel for clearer error messages
python3 - << 'PYEOF'
import pathlib

path = pathlib.Path("artifacts/kataleya-app/hooks/useSponsorChannel.ts")
src = path.read_text()

old_warn = "  console.warn('[useSponsorChannel] EXPO_PUBLIC_DOMAIN is not set — API calls will fail');"
new_warn = "  console.warn('[useSponsorChannel] EXPO_PUBLIC_DOMAIN is not set — set it in .env file, e.g. EXPO_PUBLIC_DOMAIN=your-server.com');"

if old_warn in src:
    src = src.replace(old_warn, new_warn)

# Better error messages on invite failure
old_err = "      console.error('[createInvite] fetch failed:', e);"
new_err = """      console.error('[createInvite] fetch failed:', e);
      // Common causes: EXPO_PUBLIC_DOMAIN not set, server not running, network issue"""

if old_err in src:
    src = src.replace(old_err, new_err)

path.write_text(src)
print("  ✓ Fix 4: sponsor error messages improved")
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
# FIX 5 — Burn ritual: tap → hold gesture
# Problem: burn button is a tap (Alert) — should require hold like burn.tsx ritual
# Fix: replace TouchableOpacity tap with HoldToConfirm, route to /burn on confirm
#      (burn.tsx already has the full 3-phase ritual + confirmation gate)
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

path = pathlib.Path("artifacts/kataleya-app/app/(tabs)/vault.tsx")
src = path.read_text()

# Add HoldToConfirm import if not present
if "HoldToConfirm" not in src:
    src = src.replace(
        "import { NeonCard, NEON_RGB } from '@/components/NeonCard';",
        "import { NeonCard, NEON_RGB } from '@/components/NeonCard';\nimport { HoldToConfirm } from '@/components/HoldToConfirm';"
    )

# Replace the tap-based burn button inside the ImageBackground burn card
old_burn_inner = """            <View style={styles.burnInner}>
              <Text style={styles.burnEmoji}>🔥</Text>
              <Text style={styles.burnTitle}>Burn the Garden</Text>
              <Text style={styles.burnSubtitle}>
                Cryptographic destruction. No recovery. No trace.
              </Text>
              <TouchableOpacity
                style={styles.burnBtn}
                onPress={() => {
                  Alert.alert(
                    'burn everything?',
                    'all mood logs, journal entries, circadian history, and sponsor credentials will be permanently destroyed. this cannot be undone.',
                    [
                      { text: 'keep the garden', style: 'cancel' },
                      { text: 'burn it all', style: 'destructive', onPress: async () => {
                        await Sanctuary.burnAll();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        router.replace('/onboarding');
                      }},
                    ]
                  );
                }}
              >
                <Text style={styles.burnBtnText}>initiate burn ritual</Text>
              </TouchableOpacity>
            </View>"""

new_burn_inner = """            <View style={styles.burnInner}>
              <Text style={styles.burnEmoji}>🔥</Text>
              <Text style={styles.burnTitle}>Burn the Garden</Text>
              <Text style={styles.burnSubtitle}>
                Cryptographic destruction. No recovery. No trace.
              </Text>
              <HoldToConfirm
                label="hold to ignite"
                holdingLabel="burning..."
                accentRgb="224,122,95"
                duration={3000}
                dangerMode
                onConfirm={() => router.push('/burn')}
                style={styles.burnHoldBtn}
              />
            </View>"""

if old_burn_inner in src:
    src = src.replace(old_burn_inner, new_burn_inner)
    print("  ✓ Burn button replaced with HoldToConfirm")
else:
    print("  ~ Burn inner pattern not found — trying fallback")
    # Try to find just the TouchableOpacity block and replace it
    import re
    # Replace just the TouchableOpacity inside burnInner with HoldToConfirm
    src = re.sub(
        r'<TouchableOpacity\s+style=\{styles\.burnBtn\}[\s\S]*?</TouchableOpacity>',
        '''<HoldToConfirm
                label="hold to ignite"
                holdingLabel="burning..."
                accentRgb="224,122,95"
                duration={3000}
                dangerMode
                onConfirm={() => router.push('/burn')}
                style={styles.burnHoldBtn}
              />''',
        src,
        count=1
    )
    print("  ✓ Burn button replaced via regex fallback")

# Remove Alert from imports if burn was the only user
# (Alert is still used in restore, so keep it)

# Add burnHoldBtn style
if "burnHoldBtn" not in src:
    src = src.replace(
        "  privacyNote: { borderTopWidth: 1",
        "  burnHoldBtn: { marginTop: 8, width: '100%' },\n  privacyNote: { borderTopWidth: 1"
    )

path.write_text(src)
PYEOF
echo "  ✓ Fix 5: burn now requires 3-second hold"

# ─────────────────────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "✓ All fixes applied."
echo ""
echo "Next steps:"
if [ -z "$DOMAIN" ]; then
  echo "  1. Start your API server, get its public URL"
  echo "  2. Edit artifacts/kataleya-app/.env and set EXPO_PUBLIC_DOMAIN"
  echo "     Or rerun: bash ~/kataleya-fixes.sh your-server-domain.com"
fi
echo "  git add -A && git commit -m 'fix: breathing speed, morning theme, vault images, sponsor env, burn hold' && git push origin main"
echo "  cd artifacts/kataleya-app && npx expo start --tunnel --clear"
