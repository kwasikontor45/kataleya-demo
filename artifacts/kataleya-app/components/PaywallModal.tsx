import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCircadian } from '@/hooks/useCircadian';
import { TIER_META, type Feature, type Tier } from '@/utils/entitlements';

const FEATURE_COPY: Record<Feature, { title: string; body: string }> = {
  sponsor: {
    title: 'sponsor presence channel',
    body: 'connect to someone who holds you. they send water and light. you feel them without words.',
  },
  unlimitedJournal: {
    title: 'unlimited journal',
    body: 'the page never runs out. seal as many entries as you need.',
  },
  backup: {
    title: 'encrypted backup',
    body: 'your sanctuary, sealed with a passphrase. move it to a new device without exposing it.',
  },
  insights: {
    title: 'circadian insights',
    body: 'patterns from your own logs. no server, no model, no data leaving your device.',
  },
};

interface PaywallModalProps {
  visible: boolean;
  feature: Feature | null;
  onDismiss: () => void;
  onSubscribe?: (tier: Tier) => void;
}

function TierCard({
  tier,
  highlighted,
  theme,
  onPress,
}: {
  tier: Tier;
  highlighted: boolean;
  theme: any;
  onPress: () => void;
}) {
  const meta = TIER_META[tier];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.tierCard,
        {
          backgroundColor: highlighted ? `${theme.accent}15` : theme.surface,
          borderColor: highlighted ? theme.accent : theme.border,
          borderWidth: highlighted ? 1.5 : 1,
        },
      ]}
    >
      <View style={styles.tierHeader}>
        <View>
          <Text style={[styles.tierLabel, { color: highlighted ? theme.accent : theme.text }]}>
            {meta.label.toLowerCase()}
          </Text>
          <Text style={[styles.tierTagline, { color: theme.textMuted }]}>{meta.tagline}</Text>
        </View>
        <View style={styles.tierPriceBlock}>
          <Text style={[styles.tierPrice, { color: highlighted ? theme.accent : theme.text }]}>
            {meta.price}
          </Text>
          {meta.priceNote !== 'always' && (
            <Text style={[styles.tierPriceNote, { color: theme.textMuted }]}>{meta.priceNote}</Text>
          )}
        </View>
      </View>
      {highlighted && (
        <View style={styles.tierFeatures}>
          {meta.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={[styles.featureBullet, { color: theme.accent }]}>◆</Text>
              <Text style={[styles.featureText, { color: theme.text }]}>{f}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function PaywallModal({ visible, feature, onDismiss, onSubscribe }: PaywallModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useCircadian();
  const featureCopy = feature ? FEATURE_COPY[feature] : null;

  const handleSubscribe = (tier: Tier) => {
    onSubscribe?.(tier);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.bg,
              paddingBottom: Platform.OS === 'ios' ? insets.bottom + 16 : 24,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScroll}
          >
            {featureCopy && (
              <View style={styles.featureIntro}>
                <Text style={[styles.eyebrow, { color: theme.textMuted }]}>bloom feature</Text>
                <Text style={[styles.featureTitle, { color: theme.text }]}>
                  {featureCopy.title}
                </Text>
                <Text style={[styles.featureBody, { color: theme.textMuted }]}>
                  {featureCopy.body}
                </Text>
              </View>
            )}

            {!featureCopy && (
              <View style={styles.featureIntro}>
                <Text style={[styles.featureTitle, { color: theme.text }]}>
                  when the orchid opens.
                </Text>
                <Text style={[styles.featureBody, { color: theme.textMuted }]}>
                  bloom unlocks the full sanctuary — unlimited journal, sponsor channel, encrypted backup, and local insights.
                </Text>
              </View>
            )}

            <View style={styles.tiers}>
              <TierCard tier="bloom" highlighted theme={theme} onPress={() => handleSubscribe('bloom')} />
              <TierCard tier="garden" highlighted={false} theme={theme} onPress={() => handleSubscribe('garden')} />
            </View>

            <View style={[styles.seedNote, { borderColor: `${theme.border}50` }]}>
              <Text style={[styles.seedNoteText, { color: theme.textMuted }]}>
                your seed tier continues unchanged. nothing is taken away.
              </Text>
            </View>

            <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
              <Text style={[styles.dismissText, { color: theme.textMuted }]}>not now</Text>
            </TouchableOpacity>

            <Text style={[styles.legalNote, { color: `${theme.textMuted}60` }]}>
              subscriptions managed through the App Store or Google Play.
              cancel any time.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 3,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 20,
  },
  featureIntro: { gap: 8 },
  eyebrow: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  featureTitle: {
    fontFamily: 'CourierPrime',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
  },
  featureBody: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 21,
    opacity: 0.85,
  },
  tiers: { gap: 10 },
  tierCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  tierLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tierTagline: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  tierPriceBlock: { alignItems: 'flex-end' },
  tierPrice: {
    fontFamily: 'CourierPrime',
    fontSize: 18,
    fontWeight: '700',
  },
  tierPriceNote: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  tierFeatures: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureBullet: { fontFamily: 'CourierPrime', fontSize: 8, marginTop: 5, flexShrink: 0 },
  featureText: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19, flex: 1 },
  seedNote: {
    borderTopWidth: 1,
    paddingTop: 14,
    alignItems: 'center',
  },
  seedNoteText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 17,
  },
  dismissBtn: { alignItems: 'center', paddingVertical: 6 },
  dismissText: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  legalNote: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 14,
    paddingBottom: 4,
  },
});
