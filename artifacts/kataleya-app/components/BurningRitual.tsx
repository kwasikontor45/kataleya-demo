'use no memo';
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemeTokens } from '@/constants/theme';
import { Sanctuary, Surface, Fortress } from '@/utils/storage';
import { HoldToConfirm } from '@/components/HoldToConfirm';

const DANGER_RGB = '255,80,80';

interface Props {
  theme: ThemeTokens;
  onComplete: () => void;
  onCancel: () => void;
}

export function BurningRitual({ theme, onComplete, onCancel }: Props) {
  const [burned, setBurned] = useState(false);

  const executeBurn = async () => {
    setBurned(true);
    await Surface.writeBurnTombstone();
    try {
      await Promise.all([
        Sanctuary.wipeSQLiteData(),
        Fortress.clear(),
      ]);
      await Surface.clearAll();
    } catch (error) {
      console.error('Critical: burn interrupted during native phase', error);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (burned) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={[styles.burnTitle, { color: `rgba(${DANGER_RGB},0.8)` }]}>
          the garden has burned.
        </Text>
        <Text style={[styles.burnSubtitle, { color: theme.textMuted }]}>
          the ground returns to zero.{'\n'}you can begin again.
        </Text>
        <TouchableOpacity
          style={[styles.afterBtn, {
            borderColor: `rgba(${DANGER_RGB},0.3)`,
            backgroundColor: `rgba(${DANGER_RGB},0.06)`,
          }]}
          onPress={onComplete}
        >
          <Text style={[styles.afterBtnText, { color: `rgba(${DANGER_RGB},0.7)` }]}>
            begin again
          </Text>
        </TouchableOpacity>
        <Text style={[styles.afterNote, { color: `${theme.textMuted}60` }]}>
          nothing remains. no trace. no record.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Text style={[styles.cancelText, { color: theme.textMuted }]}>← return</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: `rgba(${DANGER_RGB},0.85)` }]}>
        burn the garden
      </Text>

      <Text style={[styles.subtitle, { color: `${theme.textMuted}99` }]}>
        this will permanently destroy all records.{'\n'}
        mood logs. journal entries. all three vaults.{'\n'}
        no backup. no recovery. the ground returns to zero.
      </Text>

      <HoldToConfirm
        label="hold to ignite"
        holdingLabel="burning..."
        accentRgb="224,122,95"
        duration={3000}
        dangerMode
        onConfirm={executeBurn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  cancelBtn: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
  cancelText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    letterSpacing: 1,
  },
  title: {
    fontFamily: 'CourierPrime',
    fontSize: 22,
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
  },
  burnTitle: {
    fontFamily: 'CourierPrime',
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  burnSubtitle: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
  },
  afterBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  afterBtnText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    letterSpacing: 2,
  },
  afterNote: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
