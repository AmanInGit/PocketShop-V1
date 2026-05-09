import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useVendor } from './useVendor';
import { useAnalytics } from './useAnalytics';
import { useProducts } from './useProducts';
import {
  buildRecommendations,
  formatRecommendationFallback,
  type RecommendationItem,
} from '@/features/vendor/utils/recommendations';

type RecommendationCopy = {
  id: string;
  title: string;
  message: string;
  why?: string;
};

export function useRecommendations(days: number = 30) {
  const { data: vendor } = useVendor();
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(days);
  const { data: products, isLoading: productsLoading } = useProducts();

  const baseItems: RecommendationItem[] = useMemo(() => {
    return buildRecommendations({
      analytics,
      products: products as any,
    });
  }, [analytics, products]);

  const copyQuery = useQuery({
    queryKey: ['recommendations-copy', vendor?.id, baseItems],
    queryFn: async () => {
      if (!baseItems.length) return [] as RecommendationCopy[];

      const { data, error } = await supabase.functions.invoke(
        'generate-recommendations',
        {
          body: {
            vendor: { businessName: vendor?.business_name ?? null },
            items: baseItems,
          },
        }
      );

      if (error) throw error;
      const out = (data as any)?.items;
      if (!Array.isArray(out)) throw new Error('Invalid recommendations response');
      return out as RecommendationCopy[];
    },
    enabled: baseItems.length > 0,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const merged = useMemo(() => {
    const llm = copyQuery.data ?? null;
    const llmById = new Map<string, RecommendationCopy>(
      (llm ?? []).map((x) => [x.id, x])
    );

    return baseItems.map((item) => {
      const enriched = llmById.get(item.id);
      if (enriched) {
        return {
          ...item,
          copy: enriched,
        };
      }

      const fallback = formatRecommendationFallback(item);
      return {
        ...item,
        copy: { id: item.id, ...fallback },
      };
    });
  }, [baseItems, copyQuery.data]);

  return {
    items: merged,
    isLoading: analyticsLoading || productsLoading,
    isEnriching: copyQuery.isFetching,
    enrichError: copyQuery.error,
  };
}

