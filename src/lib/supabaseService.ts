import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseUrl, getSupabaseServiceKey } from "./secure-env"

// Create service role client for operations that need to bypass RLS
export const supabaseService: SupabaseClient = createClient(
  getSupabaseUrl(),
  getSupabaseServiceKey()
)
