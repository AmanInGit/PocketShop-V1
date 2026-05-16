import logoImage from '@/assets/images/logo.png';
import { missingSupabaseEnvMessage } from '@/lib/appConfig';

export function ConfigError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <img src={logoImage} alt="PocketShop" className="h-12 w-12 object-contain" />
      <h1 className="text-xl font-semibold text-slate-900">Configuration required</h1>
      <p className="max-w-md text-sm text-slate-600">{missingSupabaseEnvMessage}</p>
      <p className="max-w-md text-xs text-slate-500">
        After saving variables, trigger a new deployment from the Cloudflare dashboard.
      </p>
    </div>
  );
}
