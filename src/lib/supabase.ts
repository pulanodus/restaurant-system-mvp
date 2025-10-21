import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseUrl, getSupabaseAnonKey, validateEnvironment } from "./secure-env"

// Validate environment variables
validateEnvironment()

const supabaseUrl = getSupabaseUrl()
const supabaseAnonKey = getSupabaseAnonKey()

// Enhanced fetch function without excessive logging to prevent sensitive data exposure
const createSecureFetch = () => {
  return async (input: RequestInfo | URL, options: RequestInit = {}) => {
    try {
      const response = await fetch(input, options)
      return response
    } catch (_error) {
      // Only log errors, and even then minimally
      console.error('Supabase network error occurred')
      throw _error
    }
  }
}

// Create Supabase client with secure fetch (no sensitive data logging)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: createSecureFetch()
  }
})