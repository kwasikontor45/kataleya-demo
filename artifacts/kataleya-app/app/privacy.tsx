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

// Privacy content mirrors the vault architecture exactly
// Three vaults: Surface (AsyncStorage) / Sanctuary (SQLite) / Fortress (SecureStore)
const SECTIONS = [
  {
    title: '◈  sanctuary — your inner vault',
    items: [
      'every mood log: score, circadian phase, restlessness reading, optional note — stored in SQLite on this device. no network port. no user_id column.',
      'every journal entry, sealed in the app. 4,000 characters. delete-on-demand. never transmitted.',
      'circadian event history used only to generate local pattern insights. zero network calls.',
      'the schema has no user_id column. we cannot query your data even if we wanted to.',
    ],
  },
  {
    title: '◎  fortress — hardware-backed keys',
    items: [
      'sponsor channel credentials and end-to-end encryption keys live in the OS keychain — iOS Secure Enclave on modern iPhones, Android Keystore.',
      'eight keys total. all eight are deleted atomically on disconnect — no orphaned fragments.',
      'private keys are generated on your device and never transmitted. the relay server cannot compute the shared secret from public keys alone.',
    ],
  },
  {
    title: '·  surface — preferences only',
    items: [
      'your display name, sobriety date, notification preferences, dark mode setting.',
      'no health data lives here. it can be reset anytime without touching sanctuary or fortress.',
    ],
  },
  {
    title: '·  what your sponsor sees',
    items: [
      'daily check-in: yes or no. the timestamp is not transmitted — only the date string.',
      'your recovery stage — a single word derived from days sober.',
      'the number of milestones reached — an integer.',
      'presence signals you choose to send: water or light. type only, no health context.',
      'they cannot see mood scores, journal content, sobriety start date, substance type, restlessness data, or any private key.',
    ],
  },
  {
    title: '◎  messages',
    items: [
      'end-to-end encrypted using TweetNaCl — X25519 Diffie-Hellman key exchange, XSalsa20-Poly1305 authenticated encryption.',
      'the relay server stores only ciphertext and a random nonce. it cannot decrypt anything.',
      'messages are bounded at 200 per channel and are not persisted through server restarts.',
      'a new key pair is generated for every connection. no key survives a disconnect.',
    ],
  },
  {
    title: '⌁  the burn ritual',
    items: [
      'phase 1: a tombstone key is written to surface before any wipe begins. crash-safe.',
      'phase 2: sanctuary (SQLite) and fortress (keychain) are wiped in parallel.',
      'phase 3: surface is cleared last — including the tombstone. a clean burn leaves nothing.',
      'if the app is killed mid-burn, the next launch detects the tombstone and completes the wipe invisibly.',
      'after a clean burn, kataleya has no memory of you. nothing persists anywhere.',
    ],
  },
  {
    title: '∿  what we never see',
    items: [
      'no analytics SDK. no crash reporter. no advertising network of any kind.',
      'no Firebase, Amplitude, Sentry, Mixpanel, or equivalent.',
      'no user database on the server. channel routing state lives in memory only and expires automatically.',
      'we cannot be subpoenaed for health data we do not hold.',
    ],
  },
  {
    title: 'contact',
    items: [
      'questions about privacy? privacy@kataleya.app',
      'this document describes actual code behaviour, not a legal policy. the source is on github.',
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
            three vaults, zero network exposure, one burn ritual.
            this document describes exactly how your data is protected in code.
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
