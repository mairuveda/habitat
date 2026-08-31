import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const publishableKey =
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

const storage = typeof window !== "undefined" ? window.sessionStorage : undefined;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: Boolean(storage),
        storage,
        autoRefreshToken: Boolean(storage),
        detectSessionInUrl: Boolean(storage)
      }
    })
  : null;
