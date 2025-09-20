import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseUrl, getSupabaseServiceKey, validateEnvironment } from "./secure-env"

// Validate environment variables
validateEnvironment()

const supabaseUrl = getSupabaseUrl()
const supabaseServiceKey = getSupabaseServiceKey()

export const supabaseServer: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey)
