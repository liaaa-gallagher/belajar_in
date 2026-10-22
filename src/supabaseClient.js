import { createClient } from "@supabase/supabase-js";

// ============================================================================
// SUPABASE CONFIGURATION
// Paste your Supabase Project URL and Public Anon / Publishable Key below:
// ============================================================================

// 1. Paste your Supabase URL here:
const SUPABASE_URL = "https://jfntqpuomjafupobsowc.supabase.co/rest/v1/";

// 2. Paste your Supabase Public Key (Anon / Publishable Key) here:
const SUPABASE_PUBLIC_KEY = "sb_publishable_WnyDNDRMTwQPYqOYow9z-A_ImT0YKDq";

// Create and export the Supabase client instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
