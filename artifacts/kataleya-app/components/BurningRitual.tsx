'use no memo';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemeTokens } from '@/constants/theme';
import { Sanctuary, Surface, Fortress } from '@/utils/storage';
import { HoldToConfirm } from '@/components/HoldToConfirm';

type BurnReason = 'no_longer_serves' | 'begin_again' | 'not_this_way' | 'private' | null;

interface Props {
  theme: ThemeTokens;
  onComplete: () => void;
  onCancel: () => void;
}

const REASONS = [
  { id: 'no_longer_serves' as const, label: 'The data no longer serves me' },
  { id: 'begin_again'      as const, label: 'I need to begin again' },
  { id: 'not_this_way'     as const, label: 'I do not want to be known this way' },
  { id: 'private'          as const, label: '[No reason / Private]' },
];

const DANGER_RGB = '255,80,80';

export function BurningRitual({ theme, onComplete, onCancel }: Props) {
  const [burned, setBurned] = useState(false);

  // ── Hold complete → confirmation gate ─────────────────────────────────────
  const handleHoldComplete = () => {
    setConfirming(true);
  };

  const cancelConfirmation = () => {
    setConfirming(false);
  };

  // ── Confirmed: execute the 3-phase burn ───────────────────────────────────
  const executeBurn = async () => {
    setBurned(true);

    // Phase 1 — Tombstone
    // Written FIRST. If the OS kills the process during Phase 2,
    // this key survives and triggers recovery on next launch.
    await Surface.writeBurnTombstone();

    try {
      // Phase 2 — Parallel native vault wipes
      // Sanctuary (SQLite) and Fortress (Keychain) are independent.
      // Neither touches Surface, so the tombstone stays alive.
      await Promise.all([
        Sanctuary.wipeSQLiteData(),
        Fortress.clear(),
      ]);

      // Phase 3 — Surface wipe (last)
      // Only runs after both native vaults confirm empty.
      // This erases the tombstone — a clean burn leaves no trace.
      await Surface.clearAll();
    } catch (error) {
      // Native wipe interrupted — tombstone in Surface survives.
      // Next launch detects it and re-attempts before rendering any UI.
      console.error('Critical: burn interrupted during native phase', error);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── Post-burn completion screen ───────────────────────────────────────────
  if (burned) {
    return (
      <View style={[styles.container, styles.afterContainer, { backgroundColor: theme.bg }]}>
        <Text style={[styles.burnTitle, { color: theme.danger }]}>
          the garden has burned.
        </Text>
        <Text style={[styles.burnSubtitle, { color: theme.textMuted }]}>
          the ground returns to zero.{'\n'}you can begin again.
        </Text>

        <View style={styles.afterActions}>
          <TouchableOpacity
            style={[styles.afterBtn, { borderColor: `rgba(${DANGER_RGB},0.3)`, backgroundColor: `rgba(${DANGER_RGB},0.06)` }]}
            onPress={onComplete}
          >
            <Text style={[styles.afterBtnText, { color: `rgba(${DANGER_RGB},0.7)` }]}>begin again</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.afterNote, { color: `${theme.textMuted}60` }]}>
          nothing remains. no trace. no record.
        </Text>
      </View>
    );
  }

  // ── Confirmation gate — shown after hold completes, before wipe executes ──
  if (confirming) {
    return (
      <View style={[styles.container, styles.confirmContainer, { backgroundColor: theme.bg }]}>
        <Text style={[styles.confirmMessage, { color: theme.text }]}>
          This will permanently erase everything.{'\n'}There is no undo.
        </Text>

        <View style={styles.confirmActions}>
          <TouchableOpacity
            style={[styles.confirmEraseBtn, { borderColor: theme.danger, backgroundColor: `${theme.danger}18` }]}
            onPress={executeBurn}
            activeOpacity={0.8}
          >
            <Text style={[styles.confirmEraseBtnText, { color: theme.danger }]}>
              Erase everything
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmCancelBtn, { borderColor: theme.border }]}
            onPress={cancelConfirmation}
            activeOpacity={0.8}
          >
            <Text style={[styles.confirmCancelBtnText, { color: theme.textMuted }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Default: reason selection + hold gesture ──────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Text style={[styles.cancelText, { color: theme.textMuted }]}>← return</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.danger }]}>Burn the Garden</Text>
      <Text style={[styles.subtitle, { color: theme.text, opacity: 0.75 }]}>
        You are about to destroy all records.{'\n'}This cannot be undone. We cannot recover it. No one can.
      </Text>


      {/* ── Hold to ignite — uses shared HoldToConfirm, danger mode ── */}
      <HoldToConfirm
        label="hold to ignite"
        holdingLabel="burning..."
        accentRgb={DANGER_RGB}
        duration={3000}
        dangerMode

        onConfirm={handleHoldComplete}
        style={styles.igniteWrapper}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  cancelBtn: { marginBottom: 32 },
  cancelText: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 1 },
  title: {
    fontFamily: 'CourierPrime',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 32,
  },
  reasons: { gap: 8, marginBottom: 40 },
  reasonBtn: { borderWidth: 1, borderRadius: 8, padding: 14 },
  reasonText: { fontFamily: 'CourierPrime', fontSize: 13 },
  igniteWrapper: { marginTop: 'auto' as any },

  // ── Confirmation gate ─────────────────────────────────────────────────────
  confirmContainer: {
    justifyContent: 'center',
    gap: 40,
    paddingHorizontal: 32,
    paddingTop: 0,
  },
  confirmMessage: {
    fontFamily: 'CourierPrime',
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    opacity: 0.9,
  },
  confirmActions: { gap: 12 },
  confirmEraseBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmEraseBtnText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  confirmCancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmCancelBtnText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ── Post-burn completion ──────────────────────────────────────────────────
  afterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 32,
    paddingTop: 0,
  },
  burnTitle: {
    fontFamily: 'CourierPrime',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  burnSubtitle: {
    fontFamily: 'CourierPrime',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  afterActions: { width: '100%', gap: 10 },
  afterBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  afterBtnText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  afterNote: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 16,
  },
});
