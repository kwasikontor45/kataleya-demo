/**
 * Entitlement hook — returns the current user's tier and helper methods.
 *
 * Right now everyone gets Bloom (PAYWALL_ACTIVE = false).
 * When RevenueCat is connected: replace the useState('bloom') with the RC hook
 * and the gate checks will enforce automatically.
 */

import { useState, useCallback } from 'react';
import { canAccess, PAYWALL_ACTIVE, type Tier, type Feature } from '@/utils/entitlements';

export function useEntitlements() {
  const [tier] = useState<Tier>('bloom');
  const [paywallFeature, setPaywallFeature] = useState<Feature | null>(null);

  const check = useCallback((feature: Feature): boolean => {
    if (canAccess(feature, tier)) return true;
    setPaywallFeature(feature);
    return false;
  }, [tier]);

  const dismissPaywall = useCallback(() => {
    setPaywallFeature(null);
  }, []);

  return {
    tier,
    isBloom: tier === 'bloom' || tier === 'garden',
    isGarden: tier === 'garden',
    isSeed: tier === 'seed',
    paywallActive: PAYWALL_ACTIVE,
    paywallFeature,
    check,
    dismissPaywall,
  };
}
