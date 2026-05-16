/**
 * Main App Component
 *
 * Application entry point with routing and auth provider.
 * Public routes render immediately; protected routes wait for auth in their guards.
 */

import { ConfigError } from '@/components/ConfigError';
import { isSupabaseConfigured } from '@/lib/appConfig';
import { AppProviders } from './AppProviders';

function App() {
  if (import.meta.env.PROD && !isSupabaseConfigured()) {
    return <ConfigError />;
  }

  return <AppProviders />;
}

export default App;
