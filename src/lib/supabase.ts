import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
  dotenv.config();
}

const getEnvVar = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || '';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Only throw if neither env is defined
  throw new Error(
    'Missing Supabase configuration: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined in your environment variables.'
  );
}

/**
 * Singleton Supabase client instance for client-side authentication and database operations.
 * Uses public anon key with Row Level Security (RLS) enforcement.
 * NEVER expose the service_role key on the client.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
