import { Link } from 'react-router-dom';
import { MapPin, Store } from 'lucide-react';
import { offerChipFromMetadata, type ShopsVendorProfile } from '@/hooks/useShopsVendors';

export interface RestaurantVendorCardProps {
  vendor: ShopsVendorProfile;
  to: string;
}

export function RestaurantVendorCard({ vendor, to }: RestaurantVendorCardProps) {
  const chip = offerChipFromMetadata(vendor.metadata);

  return (
    <Link
      to={to}
      className="block bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800/60 active:scale-[0.99] transition-all text-left"
    >
      <div className="relative h-36 sm:h-40 bg-gradient-to-br from-orange-100 to-amber-50 dark:from-slate-800 dark:to-slate-900">
        {vendor.banner_url ? (
          <img src={vendor.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Store className="w-16 h-16 text-orange-200/80 dark:text-slate-600" />
          </div>
        )}
        {chip ? (
          <span className="absolute top-3 left-3 rounded-md bg-orange-500 text-white text-xs font-bold px-2 py-1 shadow">
            {chip}
          </span>
        ) : null}
        <div className="absolute -bottom-6 left-4 w-[4.5rem] h-[4.5rem] rounded-xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 shadow-md overflow-hidden flex items-center justify-center">
          {vendor.logo_url ? (
            <img src={vendor.logo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Store className="w-8 h-8 text-gray-400" />
          )}
        </div>
      </div>
      <div className="pt-8 pb-4 px-4">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-slate-100 pr-2">{vendor.business_name}</h3>
        {vendor.business_type ? (
          <p className="text-sm text-gray-500 dark:text-slate-400 capitalize mt-0.5">
            {vendor.business_type.replace(/-/g, ' ')}
          </p>
        ) : null}
        {vendor.address ? (
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 flex items-start gap-1 line-clamp-2">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {vendor.address}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
