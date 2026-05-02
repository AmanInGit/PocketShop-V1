/**
 * Customer Home – mobile-first discovery and ordering hub (Swiggy-style feed).
 * Offers carousel, city selector, restaurant cards → storefront menu.
 */

import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES, storefrontPath } from '@/constants/routes';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useBestOffer } from '@/hooks/useBestOffer';
import {
  useShopsVendors,
  CITY_QUERY_PARAM,
  CITY_STORAGE_KEY,
  normalizeCity,
} from '@/hooks/useShopsVendors';
import { OffersCarousel } from '@/components/marketing/OffersCarousel';
import Logo from '@/features/common/components/Logo';
import { ChevronRight, Clock, MapPin, ShoppingBag, Store, User } from 'lucide-react';
import imgQuickBites from '@/assets/images/categories/quick-bites.png';
import imgFineDining from '@/assets/images/categories/fine-dining.png';
import { DEFAULT_SERVICE_CITY, SUPPORTED_SERVICE_CITIES } from '@/features/common/constants/serviceCities';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RestaurantVendorCard } from '@/components/shops/RestaurantVendorCard';

const CATEGORY_IMAGES = {
  quickBites: imgQuickBites,
  fineDining: imgFineDining,
};

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

export default function CustomerHome() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const hasCustomerAccount = !!user && user.role === 'customer';
  const { getTotalItems } = useCart();
  const cartCount = getTotalItems();
  const { landingOffers, isLoading: offersLoading } = useBestOffer();

  const cityFromUrl = normalizeCity(searchParams.get(CITY_QUERY_PARAM));
  const cityFromStorage = normalizeCity(localStorage.getItem(CITY_STORAGE_KEY));
  const selectedCity = cityFromUrl || cityFromStorage || DEFAULT_SERVICE_CITY;

  const { vendors, loading: vendorsLoading } = useShopsVendors(selectedCity, 'all');

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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm pt-[env(safe-area-inset-top,0px)]">
        <div className="px-4 sm:px-6 py-3 sm:py-3 max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-3">
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
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
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

        {!offersLoading && landingOffers.length > 0 && (
          <section className="mb-8" aria-label="Offers and coupons">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-3">Top offers for you</h2>
            <OffersCarousel landingOffers={landingOffers} variant="customer" />
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-4 tracking-tight">
            What are you craving?
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            <button
              type="button"
              onClick={() => navigate(`${ROUTES.SHOPS}?category=quick-bites&${CITY_QUERY_PARAM}=${encodeURIComponent(selectedCity)}`)}
              className="flex items-center gap-4 p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-orange-200 dark:hover:border-orange-900/60 transition-all text-left"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center overflow-hidden">
                <img
                  src={CATEGORY_IMAGES.quickBites}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 leading-tight">
                  Quick Bites
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                  Snacks, cafe, fast food
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => navigate(`${ROUTES.SHOPS}?category=fine-dining&${CITY_QUERY_PARAM}=${encodeURIComponent(selectedCity)}`)}
              className="flex items-center gap-4 p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-orange-200 dark:hover:border-orange-900/60 transition-all text-left"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center overflow-hidden">
                <img
                  src={CATEGORY_IMAGES.fineDining}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 leading-tight">
                  Fine Dining
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                  Restaurants & more
                </p>
              </div>
            </button>
          </div>
        </section>

        <section className="mb-8" aria-label="Restaurants near you">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Restaurants near you</h2>
            <Link
              to={`${ROUTES.SHOPS}?${CITY_QUERY_PARAM}=${encodeURIComponent(selectedCity)}`}
              className="text-sm font-semibold text-orange-600 dark:text-orange-400 shrink-0"
            >
              See all
            </Link>
          </div>

          {vendorsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
              <Store className="w-14 h-14 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-slate-400 text-sm max-w-xs mx-auto">
                No restaurants in {selectedCityLabel} yet. Try another city.
              </p>
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
        </section>

        {hasCustomerAccount && (
          <section className="mb-8">
            <Link
              to={ROUTES.CUSTOMER_PROFILE}
              className="flex items-center justify-between gap-4 p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-900/60 transition-colors"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-11 h-11 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/25 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">My orders</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Track and reorder</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 shrink-0" />
            </Link>
          </section>
        )}

        <section className="mt-8 sm:mt-10">
          <Link
            to={ROUTES.HOME}
            className="block text-center text-sm sm:text-base text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 py-4"
          >
            Back to main site
          </Link>
        </section>
      </main>

      {cartCount > 0 && (
        <button
          type="button"
          onClick={() => navigate(ROUTES.SHOPS)}
          className="fixed z-30 flex items-center gap-2 px-5 py-3.5 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 active:scale-95 touch-target transition-transform"
          style={{
            bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
            right: 'max(1rem, env(safe-area-inset-right, 1rem))',
          }}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="font-semibold">{cartCount} items</span>
        </button>
      )}
    </div>
  );
}
