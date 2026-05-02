/**
 * Shared vendor list for Shops and Customer home (city + category filters).
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const CITY_QUERY_PARAM = 'city';
export const CITY_STORAGE_KEY = 'shops:selected-city';

/** `all` = all food-type vendors in the selected city (Swiggy-style home feed). */
export type ShopsCategorySlug = 'quick-bites' | 'fine-dining' | 'all';

const CATEGORY_FILTERS: Record<string, string[]> = {
  'quick-bites': ['cafe', 'fast-food', 'bakery', 'chinese', 'indian', 'italian', 'desserts'],
  'fine-dining': ['restaurant', 'italian', 'indian'],
};

const FOOD_TYPES = ['restaurant', 'cafe', 'bakery', 'fast-food', 'chinese', 'indian', 'italian', 'desserts'];

export interface ShopsVendorProfile {
  id: string;
  business_name: string;
  business_type: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  address: string | null;
  city: string | null;
  is_active: boolean;
  metadata?: { business_category?: string; offers?: unknown[] };
}

export const normalizeCity = (value: string | null | undefined) => (value || '').trim().toLowerCase();

/** First active offer as a short chip label for vendor cards. */
export function offerChipFromMetadata(meta: ShopsVendorProfile['metadata']): string | null {
  const offers = meta?.offers;
  if (!Array.isArray(offers) || offers.length === 0) return null;
  const o = offers[0] as { type?: string; value?: number; max_discount?: number };
  if (!o || (o.value ?? 0) <= 0) return null;
  if (o.type === 'flat') return `₹${o.value} OFF`;
  return o.max_discount ? `${o.value}% OFF` : `${o.value}% OFF`;
}

function filterVendorsForCategory(
  cityFiltered: ShopsVendorProfile[],
  category: string
): ShopsVendorProfile[] {
  if (category === 'all') {
    const foodVendors = cityFiltered.filter((v) => {
      const t = (v.business_type || '').toLowerCase();
      return FOOD_TYPES.some((f) => t.includes(f));
    });
    return foodVendors.length > 0 ? foodVendors : cityFiltered;
  }

  const filters = CATEGORY_FILTERS[category];
  const filtered = filters
    ? cityFiltered.filter((v) => {
        const type = (v.business_type || '').toLowerCase();
        const cat = (v.metadata?.business_category || '').toLowerCase();
        return filters.some((f) => type.includes(f) || cat.includes(f));
      })
    : cityFiltered;

  const foodVendors = cityFiltered.filter((v) => {
    const t = (v.business_type || '').toLowerCase();
    return FOOD_TYPES.some((f) => t.includes(f));
  });

  if (filtered.length > 0) return filtered;
  if (foodVendors.length > 0) return foodVendors;
  return cityFiltered;
}

export function useShopsVendors(selectedCity: string, category: ShopsCategorySlug | string) {
  const [vendors, setVendors] = useState<ShopsVendorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchVendors() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('vendor_profiles')
          .select(
            'id, business_name, business_type, description, logo_url, banner_url, address, city, is_active, metadata'
          )
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching vendors:', error);
          if (!cancelled) setVendors([]);
          return;
        }

        const profiles = (data || []) as ShopsVendorProfile[];
        const cityFiltered = profiles.filter((v) => normalizeCity(v.city) === normalizeCity(selectedCity));
        const final = filterVendorsForCategory(cityFiltered, category);

        if (!cancelled) setVendors(final);
      } catch (e) {
        console.error(e);
        if (!cancelled) setVendors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchVendors();
    return () => {
      cancelled = true;
    };
  }, [selectedCity, category]);

  return { vendors, loading };
}
