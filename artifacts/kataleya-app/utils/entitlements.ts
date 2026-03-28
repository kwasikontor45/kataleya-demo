/**
 * Subscription tier definitions for Kataleya.
 *
 * PAYWALL_ACTIVE = false  →  all users access all features (current state).
 * PAYWALL_ACTIVE = true   →  tier gates are enforced (flip once RevenueCat is live).
 *
 * Gate check pattern:
 *   const { canAccess } = useEntitlements();
 *   if (!canAccess('sponsor')) { showPaywall(); return; }
 */

export type Tier = 'seed' | 'bloom' | 'garden';
export type Feature = 'sponsor' | 'unlimitedJournal' | 'backup' | 'insights';

export const PAYWALL_ACTIVE = false;

export const TIER_META: Record<Tier, {
  label: string;
  tagline: string;
  price: string;
  priceNote: string;
  features: string[];
  limits: { journalEntries: number; moodLogs: number };
}> = {
  seed: {
    label: 'Seed',
    tagline: 'the beginning of everything',
    price: 'Free',
    priceNote: 'always',
    features: [
      'Sobriety tracking & living orchid',
      'Mood log',
      'Private journal',
      'Growth milestones',
      'Circadian awareness',
    ],
    limits: { journalEntries: 10, moodLogs: 30 },
  },
  bloom: {
    label: 'Bloom',
    tagline: 'when the orchid opens',
    price: '$4.99',
    priceNote: 'per month',
    features: [
      'Everything in Seed',
      'Unlimited journal & mood log',
      'Sponsor presence channel',
      'End-to-end encrypted messages',
      'Circadian insights & patterns',
      'Encrypted backup & restore',
    ],
    limits: { journalEntries: Infinity, moodLogs: Infinity },
  },
  garden: {
    label: 'Garden',
    tagline: 'the fullness of the sanctuary',
    price: '$9.99',
    priceNote: 'per month',
    features: [
      'Everything in Bloom',
      'Priority support',
      'Advanced pattern insights',
      'Multi-orchid (coming soon)',
    ],
    limits: { journalEntries: Infinity, moodLogs: Infinity },
  },
};

export const FEATURE_REQUIRES: Record<Feature, Tier> = {
  sponsor:          'bloom',
  unlimitedJournal: 'bloom',
  backup:           'bloom',
  insights:         'bloom',
};

export function canAccess(feature: Feature, tier: Tier): boolean {
  if (!PAYWALL_ACTIVE) return true;
  const required = FEATURE_REQUIRES[feature];
  if (required === 'bloom') return tier === 'bloom' || tier === 'garden';
  if (required === 'garden') return tier === 'garden';
  return true;
}
