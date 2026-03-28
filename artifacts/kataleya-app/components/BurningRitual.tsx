'use no memo';
import React, { useState, useRef } from 'react';
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

type BurnReason = 'no_longer_serves' | 'begin_again' | 'not_this_way' | 'private' | null;

interface Props {
  theme: ThemeTokens;
  onComplete: () => void;
  onCancel: () => void;
}

const REASONS = [
  { id: 'no_longer_serves' as const, label: 'The data no longer serves me' },
  { id: 'begin_again' as const, label: 'I need to begin again' },
  { id: 'not_this_way' as const, label: 'I do not want to be known this way' },
  { id: 'private' as const, label: '[No reason / Private]' },
];

export function BurningRitual({ theme, onComplete, onCancel }: Props) {
  const [selectedReason, setSelectedReason] = useState<BurnReason>(null);
  const [isHolding, setIsHolding] = useState(false);
  // confirming: hold completed — waiting for explicit user confirmation before wipe
  const [confirming, setConfirming] = useState(false);
  const [burned, setBurned] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef<Animated.CompositeAnimation | null>(null);

  const startHold = () => {
    if (!selectedReason) return;
    setIsHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    progressAnim.current = Animated.timing(progress, {
      toValue: 100,
      duration: 3000,
      useNativeDriver: false,
    });
    progressAnim.current.start(({ finished }) => {
      if (finished) {
        // Hold complete — enter confirmation gate; do NOT wipe yet
        setIsHolding(false);
        setConfirming(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    });
  };

  const endHold = () => {
    if (burned || confirming) return;
    setIsHolding(false);
    if (progressAnim.current) progressAnim.current.stop();
    Animated.timing(progress, {
      toValue: 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  const cancelConfirmation = () => {
    setConfirming(false);
    // Reset progress bar so the user can try again or walk away
    Animated.timing(progress, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const executeBurn = async () => {
    setBurned(true);

    // ── Phase 1: Tombstone ─────────────────────────────────────────────────
    // Written FIRST — before any destructive action. If the app is killed
    // during the subsequent native wipes, this key survives in AsyncStorage
    // and the next launch detects + completes the burn automatically.
    await Surface.writeBurnTombstone();

    try {
      // ── Phase 2: Parallel native vault wipes ────────────────────────────
      // Sanctuary (SQLite) and Fortress (Keychain) are independent. Run them
      // concurrently to minimize the window where data partially exists.
      // wipeSQLiteData does NOT touch Surface, so the tombstone stays alive.
      await Promise.all([
        Sanctuary.wipeSQLiteData(),
        Fortress.clear(),
      ]);

      // ── Phase 3: Surface wipe (last) ─────────────────────────────────────
      // Only executed once both native vaults confirm empty. This also erases
      // the tombstone — a clean burn leaves no trace in any vault.
      await Surface.clearAll();
    } catch (error) {
      // Native wipe interrupted. The tombstone in Surface survives here
      // because Surface.clearAll() was never reached. Next launch will detect
      // the tombstone and re-attempt the wipe before rendering any UI.
      console.error('Critical: Burn interrupted during native phase', error);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // ── Post-burn: completion screen ──────────────────────────────────────────
  if (burned) {
    return (
      <View style={[styles.container, styles.afterContainer, { backgroundColor: theme.bg }]}>
        <Text style={[styles.burnTitle, { color: theme.danger }]}>
          The garden burns.
        </Text>
        <Text style={[styles.burnSubtitle, { color: theme.textMuted }]}>
          The orchid returns to seed.{'\n'}The soil is fresh.
        </Text>

        <View style={styles.afterActions}>
          <TouchableOpacity
            style={[styles.afterBtn, { borderColor: theme.accent, backgroundColor: `${theme.accent}18` }]}
            onPress={onComplete}
          >
            <Text style={[styles.afterBtnText, { color: theme.accent }]}>Begin Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.afterBtn, { borderColor: theme.border }]}
            onPress={onComplete}
          >
            <Text style={[styles.afterBtnText, { color: theme.textMuted }]}>Close</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.afterNote, { color: `${theme.textMuted}60` }]}>
          All data has been permanently erased.{'\n'}Nothing remains.
        </Text>
      </View>
    );
  }

  // ── Confirmation gate: shown after hold completes, before wipe executes ───
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

  // ── Default: hold gesture screen ─────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Text style={[styles.cancelText, { color: theme.textMuted }]}>← return</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.danger }]}>Burn the Garden</Text>
      <Text style={[styles.subtitle, { color: theme.text, opacity: 0.75 }]}>
        You are about to destroy all records.{'\n'}This cannot be undone. No one can recover it.
      </Text>

      <Text style={[styles.reasonLabel, { color: theme.textMuted }]}>Why are you burning?</Text>

      <View style={styles.reasons}>
        {REASONS.map(r => (
          <TouchableOpacity
            key={r.id}
            onPress={() => setSelectedReason(r.id)}
            style={[
              styles.reasonBtn,
              {
                borderColor: selectedReason === r.id ? theme.danger : theme.border,
                backgroundColor: selectedReason === r.id ? `${theme.danger}15` : 'transparent',
              },
            ]}
          >
            <Text style={[styles.reasonText, { color: theme.text }]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.igniteArea}>
        <Text style={[styles.holdLabel, { color: theme.textMuted }]}>
          {isHolding ? 'burning...' : 'hold to ignite'}
        </Text>

        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progressWidth, backgroundColor: isHolding ? theme.danger : theme.gold },
            ]}
          />
        </View>

        <TouchableOpacity
          onPressIn={startHold}
          onPressOut={endHold}
          disabled={!selectedReason}
          activeOpacity={1}
          style={[
            styles.igniteBtn,
            {
              borderColor: selectedReason ? theme.danger : theme.border,
              opacity: selectedReason ? 1 : 0.3,
              backgroundColor: isHolding ? `${theme.danger}20` : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.igniteText,
              { color: isHolding ? theme.danger : selectedReason ? theme.text : theme.textMuted },
            ]}
          >
            {isHolding ? 'BURNING...' : 'HOLD TO IGNITE'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  cancelBtn: {
    marginBottom: 32,
  },
  cancelText: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    letterSpacing: 1,
  },
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
  reasonLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  reasons: {
    gap: 8,
    marginBottom: 40,
  },
  reasonBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  reasonText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
  },
  igniteArea: {
    alignItems: 'center',
    gap: 16,
  },
  holdLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  progressTrack: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  igniteBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  igniteText: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    letterSpacing: 2.5,
  },
  // ── Confirmation gate styles (calm, no animation) ────────────────────────
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
  confirmActions: {
    gap: 12,
  },
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
  // ── Post-burn completion screen ───────────────────────────────────────────
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
  afterActions: {
    width: '100%',
    gap: 10,
  },
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
