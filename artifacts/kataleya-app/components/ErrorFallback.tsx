import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reloadAppAsync } from 'expo';

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const insets = useSafeAreaInsets();
  const [showDetail, setShowDetail] = useState(false);

  const handleReturn = async () => {
    try {
      await reloadAppAsync();
    } catch {
      resetError();
    }
  };

  const monoFont = Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.content}>
        <Text style={styles.orchidGlyph}>⟡</Text>

        <View style={styles.textBlock}>
          <Text style={styles.title}>the sanctuary{'\n'}lost its footing.</Text>
          <Text style={styles.body}>
            something unexpected happened.{'\n'}
            the garden is still here — just step back in.
          </Text>
        </View>

        <TouchableOpacity style={styles.returnBtn} onPress={handleReturn} activeOpacity={0.75}>
          <Text style={styles.returnBtnText}>return to garden</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={resetError} style={styles.tryAgainBtn}>
          <Text style={styles.tryAgainText}>try without reloading</Text>
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            onPress={() => setShowDetail(v => !v)}
            style={styles.devToggle}
          >
            <Text style={styles.devToggleText}>
              {showDetail ? '↑ hide error' : '↓ dev: show error'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {__DEV__ && showDetail && (
        <ScrollView
          style={styles.detailScroll}
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.detailText, { fontFamily: monoFont }]} selectable>
            {error.message}
            {'\n\n'}
            {error.stack ?? ''}
          </Text>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>..: kataleya :..</Text>
      </View>
    </View>
  );
}

const BG = '#050508';
const ACCENT = '#00d4aa';
const MUTED = '#5a5870';
const TEXT = '#e8e4f0';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  orchidGlyph: {
    color: ACCENT,
    fontSize: 48,
    opacity: 0.6,
    lineHeight: 56,
  },
  textBlock: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontFamily: 'CourierPrime',
    fontSize: 24,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    lineHeight: 32,
  },
  body: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 21,
  },
  returnBtn: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 36,
    backgroundColor: `${ACCENT}18`,
    alignItems: 'center',
  },
  returnBtnText: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'lowercase',
    color: ACCENT,
  },
  tryAgainBtn: { paddingVertical: 4 },
  tryAgainText: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 1.5,
    color: MUTED,
    textAlign: 'center',
  },
  devToggle: { paddingVertical: 6 },
  devToggleText: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 1,
    color: `${MUTED}80`,
  },
  detailScroll: {
    maxHeight: 220,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#1a1825',
  },
  detailContent: { padding: 14 },
  detailText: {
    fontSize: 10,
    lineHeight: 16,
    color: '#ff9999',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  footerText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 3,
    color: `${MUTED}60`,
  },
});
