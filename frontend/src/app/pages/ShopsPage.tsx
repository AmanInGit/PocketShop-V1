/**
 * Shops Page – Browse online vendors for ordering (Quick Bites / Fine Dining).
 * UI aligned with Customer Home: same header pattern and restaurant cards.
 */

import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES, storefrontPath } from '@/constants/routes';
import { useAuth } from '@/features/auth/context/AuthContext';
import Logo from '@/features/common/components/Logo';
import { ChevronLeft, MapPin, Store, User } from 'lucide-react';
import { DEFAULT_SERVICE_CITY, SUPPORTED_SERVICE_CITIES } from '@/features/common/constants/serviceCities';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useShopsVendors,
  CITY_QUERY_PARAM,
  CITY_STORAGE_KEY,
  normalizeCity,
} from '@/hooks/useShopsVendors';
import { RestaurantVendorCard } from '@/components/shops/RestaurantVendorCard';

function getInitials(fullName: string | undefined, email: string | undefined): string {
  const n = (fullName || '').trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  const local = (email?.split('@')[0] || '?').slice(0, 2);
  return local.toUpperCase();
}

function firstName(fullName: string | undefined, email: string | undefined): string {
  const n = (fullName || '').trim();
  if (n) return n.split(/\s+/)[0] || n;
  return (email?.split('@')[0] || 'there').trim();
}

export default function ShopsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || 'quick-bites';
  const cityFromUrl = normalizeCity(searchParams.get(CITY_QUERY_PARAM));
  const cityFromStorage = normalizeCity(localStorage.getItem(CITY_STORAGE_KEY));
  const selectedCity = cityFromUrl || cityFromStorage || DEFAULT_SERVICE_CITY;
  const { vendors, loading } = useShopsVendors(selectedCity, category);
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasCustomerAccount = !!user && user.role === 'customer';

  const title = category === 'fine-dining' ? 'Fine Dining' : 'Quick Bites';
  const subtitle =
    category === 'fine-dining'
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

  const profileTarget = hasCustomerAccount
    ? ROUTES.CUSTOMER_PROFILE
    : `${ROUTES.CUSTOMER_AUTH}?redirect=${encodeURIComponent(ROUTES.CUSTOMER_HOME)}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-8">
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm pt-[env(safe-area-inset-top,0px)]">
        <div className="px-4 sm:px-6 py-3 sm:py-3 max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate(ROUTES.CUSTOMER_HOME)}
              className="touch-target shrink-0 flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 -ml-1 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              aria-label="Back to home"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Home</span>
            </button>
            <Link to={ROUTES.CUSTOMER_HOME} className="shrink-0 min-w-0">
              <Logo size="md" variant="light" />
            </Link>
            {hasCustomerAccount && (
              <p className="hidden sm:block flex-1 text-center text-sm text-gray-500 dark:text-slate-400 truncate px-2">
                Hi, {firstName(user?.full_name, user?.email)}
              </p>
            )}
            <Link
              to={profileTarget}
              className="touch-target shrink-0 flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-all overflow-hidden"
              aria-label={hasCustomerAccount ? 'Open profile' : 'Sign in'}
            >
              {hasCustomerAccount && user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : hasCustomerAccount ? (
                <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 flex items-center justify-center w-full h-full">
                  {getInitials(user?.full_name, user?.email)}
                </span>
              ) : (
                <User className="w-5 h-5 text-gray-700 dark:text-slate-200" aria-hidden />
              )}
            </Link>
          </div>
          {hasCustomerAccount && (
            <p className="sm:hidden text-sm text-gray-600 dark:text-slate-300 mt-2 font-medium">
              Hi, {firstName(user?.full_name, user?.email)}
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-5 sm:py-6 max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 min-w-0">
            <MapPin className="w-4 h-4 shrink-0 text-orange-500" aria-hidden />
            <span className="truncate">{selectedCityLabel}</span>
          </div>
          <div className="w-full sm:w-[220px]">
            <Select value={selectedCity} onValueChange={handleCityChange}>
              <SelectTrigger aria-label="Change city">
                <SelectValue placeholder="City" />
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

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">{title}</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">{subtitle}</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
            <Store className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">No shops yet</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-6 max-w-sm mx-auto text-sm">
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
          <ul className="space-y-4 list-none p-0 m-0">
            {vendors.map((vendor) => (
              <li key={vendor.id}>
                <RestaurantVendorCard vendor={vendor} to={storefrontPath(vendor.id)} />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8">
          <Link
            to={ROUTES.CUSTOMER_HOME}
            className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to customer home
          </Link>
        </div>
      </main>
    </div>
  );
}
