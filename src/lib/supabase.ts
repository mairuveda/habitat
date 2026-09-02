import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRuntimeConfig, requireSupabaseConfig } from "./runtime-config";

let clientPromise: Promise<SupabaseClient> | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = getRuntimeConfig()
      .then((config) => {
        const { url, publishableKey } = requireSupabaseConfig(config);
        const storage = typeof window !== "undefined" ? window.sessionStorage : undefined;

        return createClient(url, publishableKey, {
          auth: {
            persistSession: Boolean(storage),
            storage,
            autoRefreshToken: Boolean(storage),
            detectSessionInUrl: Boolean(storage)
          }
        });
      })
      .catch((error) => {
        clientPromise = null;
        throw error;
      });
  }

  return clientPromise;
}
