import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCircadian } from '@/hooks/useCircadian';

const SECTIONS = [
  {
    title: 'what kataleya collects',
    items: [
      'Nothing that identifies you. No name, no email, no phone number — not even a user ID.',
      'No analytics SDK. No crash reporter that sends data anywhere. No advertising network, ever.',
      'The only optional network contact: when you connect to a sponsor, presence signals (water · light) and daily check-in status (yes or no) travel through an ephemeral relay. Nothing else.',
    ],
  },
  {
    title: 'what lives only on this device',
    items: [
      'Your sobriety start date.',
      'Every mood log entry, including the score, phase, and optional note.',
      'Every journal entry — sealed in the app, never transmitted.',
      'Your name or nickname, if you entered one.',
      'Growth milestones and orchid stage.',
      'Circadian event history used to generate local insights.',
      'Sponsor channel credentials, held in the OS keychain.',
    ],
  },
  {
    title: 'what your sponsor can see',
    items: [
      'Daily check-in: yes or no. Nothing else.',
      'Your orchid stage — a single word.',
      'The number of milestones you have reached.',
      'Presence signals you send to them (water, light). They cannot send data that stores on your device without your action.',
      'They cannot see your mood logs, journal entries, sobriety date, substance type, or any health data.',
    ],
  },
  {
    title: 'messages',
    items: [
      'Messages between you and your sponsor are end-to-end encrypted using TweetNaCl (box). The relay server sees only ciphertext and a nonce — it cannot read your messages.',
      'Messages are not stored permanently on the server. They are relayed and discarded.',
      'Keys are generated on your device and stored in the OS keychain. We never see them.',
    ],
  },
  {
    title: 'the burn ritual',
    items: [
      'The Burn Ritual erases all three data vaults — SQLite, AsyncStorage, and the OS keychain — in sequence.',
      'A tombstone key is written before the wipe begins. If the app is killed mid-burn, the next launch detects this and completes the erase.',
      'After a clean burn, kataleya has no memory of you. Nothing persists.',
    ],
  },
  {
    title: 'third parties',
    items: [
      'No third-party SDKs that phone home.',
      'No Firebase, Amplitude, Sentry, Mixpanel, or equivalent services embedded in this app.',
      'Expo modules used for device APIs (sensors, notifications, secure storage) do not collect or transmit your data.',
    ],
  },
  {
    title: 'contact',
    items: [
      'Questions about privacy? Reach us at privacy@kataleya.app.',
      'This document reflects the actual behavior of the app, not a legal shield. If something here is inaccurate, we want to know.',
    ],
  },
];

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useCircadian();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Text style={[styles.backText, { color: theme.textMuted }]}>← back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.textMuted }]}>privacy</Text>
          <Text style={[styles.title, { color: theme.text }]}>
            your data is yours.{'\n'}completely.
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            kataleya was designed from the start to know as little about you as possible.
            this document describes exactly what that means in practice.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: `${theme.border}60` }]} />

        {SECTIONS.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.accent }]}>
              {section.title}
            </Text>
            {section.items.map((item, ii) => (
              <View key={ii} style={styles.itemRow}>
                <Text style={[styles.bullet, { color: theme.textMuted }]}>◆</Text>
                <Text style={[styles.itemText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={[styles.divider, { backgroundColor: `${theme.border}60` }]} />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            last reviewed march 2026
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:privacy@kataleya.app')}
          >
            <Text style={[styles.footerLink, { color: theme.accent }]}>
              privacy@kataleya.app
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 0 },
  backBtn: { marginBottom: 20 },
  backText: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 1 },
  header: { gap: 12, marginBottom: 28 },
  eyebrow: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'CourierPrime',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 21,
    opacity: 0.85,
  },
  divider: { height: 1, marginVertical: 24 },
  section: { gap: 10, marginBottom: 24 },
  sectionTitle: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    fontFamily: 'CourierPrime',
    fontSize: 8,
    marginTop: 5,
    flexShrink: 0,
  },
  itemText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 21,
    flex: 1,
  },
  footer: { gap: 8, alignItems: 'center', paddingTop: 8 },
  footerText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1 },
  footerLink: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 1,
    textDecorationLine: 'underline',
  },
});
