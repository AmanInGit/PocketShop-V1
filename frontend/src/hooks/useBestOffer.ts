/**
 * Fetches the best offer across all active vendors (restaurants).
 * "Best" = highest discount amount (flat value or percentage cap).
 * Used for the Landing page promo banner.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export type OfferItem = {
  id: string;
  type: 'percentage' | 'flat';
  value: number;
  max_discount?: number;
  min_order: number;
  promo_code: string;
};

export type BestOfferResult = {
  vendorId: string;
  vendorName: string;
  vendorLogoUrl: string | null;
  offer: OfferItem;
  /** Effective max discount in ₹ for sorting (flat=value, percentage=max_discount or heuristic) */
  effectiveAmount: number;
};

function getEffectiveAmount(o: OfferItem): number {
  if (o.type === 'flat') return o.value;
  // Percentage: use cap if present, else heuristic (value% of ₹2000 = value*20)
  return o.max_discount ?? (o.value / 100) * 2000;
}

export function useBestOffer(): {
  bestOffer: BestOfferResult | null;
  landingOffers: BestOfferResult[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ['best-offer'],
    queryFn: async (): Promise<{ bestOffer: BestOfferResult | null; landingOffers: BestOfferResult[] }> => {
      const { data, error: fetchError } = await supabase
        .from('vendor_profiles')
        .select('id, business_name, logo_url, metadata')
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      const vendors = data ?? [];
      const bestOfferPerVendor: BestOfferResult[] = [];

      for (const v of vendors) {
        const meta = (v.metadata ?? {}) as Record<string, unknown>;
        if (!meta.appear_on_dashboard) continue;

        const rawOffers = meta?.offers as OfferItem[] | undefined;
        if (!Array.isArray(rawOffers) || rawOffers.length === 0) continue;

        let bestForThisVendor: BestOfferResult | null = null;

        for (const o of rawOffers) {
          if (!o || (o.value ?? 0) <= 0 || (o.min_order ?? 0) < 0) continue;
          const effectiveAmount = getEffectiveAmount(o);

          if (!bestForThisVendor || effectiveAmount > bestForThisVendor.effectiveAmount) {
            bestForThisVendor = {
              vendorId: v.id,
              vendorName: v.business_name ?? 'Partner',
              vendorLogoUrl: v.logo_url ?? null,
              offer: o,
              effectiveAmount,
            };
          }
        }

        // Enforce one banner per vendor: only push the single best offer.
        if (bestForThisVendor) bestOfferPerVendor.push(bestForThisVendor);
      }

      if (bestOfferPerVendor.length === 0) {
        return { bestOffer: null, landingOffers: [] };
      }

      bestOfferPerVendor.sort((a, b) => b.effectiveAmount - a.effectiveAmount);

      // Keep enough items to allow the landing carousel to rotate smoothly.
      // NOTE: If you want unlimited rotation, remove this slice and return all vendors.
      const landingOffers = bestOfferPerVendor.slice(0, 10);
      return {
        bestOffer: landingOffers[0] ?? null,
        landingOffers,
      };
    },
    staleTime: 60 * 1000, // 1 min
  });

  return {
    bestOffer: data?.bestOffer ?? null,
    landingOffers: data?.landingOffers ?? [],
    isLoading,
    error: error ?? null,
  };
}
