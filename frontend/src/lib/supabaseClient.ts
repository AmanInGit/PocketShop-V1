/**
 * Supabase Configuration and Client Setup
 * 
 * This file handles the connection to Supabase backend services including:
 * - Database connection
 * - Authentication
 * - Real-time subscriptions
 * - Storage for images
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/features/common/types/database';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/appConfig';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();

if (import.meta.env.DEV) {
  console.log('Supabase Config:', {
    url: supabaseUrl ? '✓ Set' : '✗ Missing',
    key: supabaseAnonKey ? '✓ Set' : '✗ Missing',
  });
}

if (!isSupabaseConfigured()) {
  console.error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

/**
 * Create Supabase client instance
 * 
 * This client will be used throughout the application for:
 * - Database operations (CRUD)
 * - User authentication
 * - Real-time subscriptions
 * - File storage
 */
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
  auth: {
    // Automatically refresh tokens
    autoRefreshToken: true,
    // Persist session in localStorage
    persistSession: true,
    // Detect session from URL (for OAuth callbacks)
    detectSessionInUrl: true,
  },
  // Enable real-time subscriptions
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  }
);

// Export the supabase client as default for direct use
export default supabase;
