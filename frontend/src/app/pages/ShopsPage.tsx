/**
 * Shops Page – Browse online vendors for ordering.
 * Shown when user clicks Quick Bites or Fine Dining from the landing page.
 * Displays vendors as cards; clicking navigates to their storefront.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { ROUTES } from '@/constants/routes';
import Logo from '@/features/common/components/Logo';
import { ArrowLeft, Store, MapPin } from 'lucide-react';
import { DEFAULT_SERVICE_CITY, SUPPORTED_SERVICE_CITIES } from '@/features/common/constants/serviceCities';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VendorProfile {
  id: string;
  business_name: string;
  business_type: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  address: string | null;
  city: string | null;
  is_active: boolean;
}

// Map category slug to business types/categories we consider matching
const CATEGORY_FILTERS: Record<string, string[]> = {
  'quick-bites': ['cafe', 'fast-food', 'bakery', 'chinese', 'indian', 'italian', 'desserts'],
  'fine-dining': ['restaurant', 'italian', 'indian'],
};

const CITY_QUERY_PARAM = 'city';
const CITY_STORAGE_KEY = 'shops:selected-city';

const normalizeCity = (value: string | null | undefined) => (value || '').trim().toLowerCase();

export default function ShopsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || 'quick-bites';
  const cityFromUrl = normalizeCity(searchParams.get(CITY_QUERY_PARAM));
  const cityFromStorage = normalizeCity(localStorage.getItem(CITY_STORAGE_KEY));
  const selectedCity = cityFromUrl || cityFromStorage || DEFAULT_SERVICE_CITY;
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const title = category === 'fine-dining' ? 'Fine Dining' : 'Quick Bites';
  const subtitle = category === 'fine-dining'
    ? 'Discover restaurants near you'
    : 'Quick meals, snacks & more';

  const selectedCityLabel =
    SUPPORTED_SERVICE_CITIES.find((city) => city.value === selectedCity)?.label || selectedCity;

  const handleCityChange = (nextCity: string) => {
    const normalizedCity = normalizeCity(nextCity);
    localStorage.setItem(CITY_STORAGE_KEY, normalizedCity);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(CITY_QUERY_PARAM, normalizedCity);
      return next;
    });
  };

  useEffect(() => {
    async function fetchVendors() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('vendor_profiles')
          .select('id, business_name, business_type, description, logo_url, banner_url, address, city, is_active, metadata')
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching vendors:', error);
          setVendors([]);
          setLoading(false);
          return;
        }

        const profiles = (data || []) as (VendorProfile & { metadata?: { business_category?: string } })[];
        const cityFilteredProfiles = profiles.filter(
          (v) => normalizeCity(v.city) === selectedCity
        );
        const filters = CATEGORY_FILTERS[category];
        const filtered = filters
          ? cityFilteredProfiles.filter((v) => {
              const type = (v.business_type || '').toLowerCase();
              const cat = (v.metadata?.business_category || '').toLowerCase();
              return filters.some((f) => type.includes(f) || cat.includes(f));
            })
          : cityFilteredProfiles;

        // If no matches from filter, show all food vendors or all vendors
        const foodTypes = ['restaurant', 'cafe', 'bakery', 'fast-food', 'chinese', 'indian', 'italian', 'desserts'];
        const foodVendors = cityFilteredProfiles.filter((v) => {
          const t = (v.business_type || '').toLowerCase();
          return foodTypes.some((f) => t.includes(f));
        });
        const final = filtered.length > 0
          ? filtered
          : (foodVendors.length > 0 ? foodVendors : cityFilteredProfiles);

        setVendors(final);
      } catch (err) {
        console.error(err);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    }

    fetchVendors();
  }, [category, selectedCity]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-8">
      {/* Header - safe area for notched devices */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-2 -ml-3 rounded-lg text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 touch-target"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <Link to={ROUTES.HOME}>
              <Logo size="md" variant="light" />
            </Link>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">{title}</h1>
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-gray-600 dark:text-slate-400">{subtitle}</p>
          <div className="w-full sm:w-[220px]">
            <Select value={selectedCity} onValueChange={handleCityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_SERVICE_CITIES.map((city) => (
                  <SelectItem key={city.value} value={city.value}>
                    {city.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
            <Store className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">No shops yet</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              No active shops found in {selectedCityLabel}. Try another city or add your shop to start receiving orders.
            </p>
            <Link
              to={ROUTES.BUSINESS}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
            >
              <Store className="w-5 h-5" />
              Add your shop
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
            <Link
              key={vendor.id}
              to={`/storefront/${vendor.id}`}
              className="block bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-900/50 active:scale-[0.99] transition-all touch-target min-h-[88px]"
            >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {vendor.logo_url ? (
                      <img
                        src={vendor.logo_url}
                        alt={vendor.business_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">{vendor.business_name}</h3>
                    {vendor.business_type && (
                      <p className="text-sm text-gray-500 dark:text-slate-400 capitalize">{vendor.business_type.replace(/-/g, ' ')}</p>
                    )}
                    {vendor.address && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {vendor.address}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
