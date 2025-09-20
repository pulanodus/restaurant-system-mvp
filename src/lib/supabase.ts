import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseUrl, getSupabaseAnonKey, validateEnvironment } from "./secure-env"

// Validate environment variables
validateEnvironment()

const supabaseUrl = getSupabaseUrl()
const supabaseAnonKey = getSupabaseAnonKey()

// Enhanced fetch function with comprehensive logging
const createDebugFetch = () => {
  return async (input: RequestInfo | URL, options: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input.toString()
    const requestId = Math.random().toString(36).substring(2, 15)
    const startTime = Date.now()
    
    // Log request details
    console.group(`🔵 Supabase Request [${requestId}]`)
    console.log('📤 URL:', url)
    console.log('📤 Method:', options.method || 'GET')
    console.log('📤 Headers:', options.headers)
    
    if (options.body) {
      try {
        const bodyData = typeof options.body === 'string' 
          ? JSON.parse(options.body) 
          : options.body
        console.log('📤 Body:', bodyData)
      } catch (_error) {
        console.log('📤 Body (raw):', options.body)
      }
    }
    
    console.log('📤 Timestamp:', new Date().toISOString())
    console.groupEnd()
    
    try {
      const response = await fetch(input, options)
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Log response details
      console.group(`🟢 Supabase Response [${requestId}]`)
      console.log('📥 Status:', response.status, response.statusText)
      console.log('📥 Headers:', Object.fromEntries(response.headers.entries()))
      console.log('📥 Duration:', `${duration}ms`)
      console.log('📥 Timestamp:', new Date().toISOString())
      
      // Clone response to read body without consuming it
      const responseClone = response.clone()
      try {
        const responseData = await responseClone.json()
        console.log('📥 Body:', responseData)
      } catch (_error) {
        console.log('📥 Body: [Non-JSON response]')
      }
      
      console.groupEnd()
      
      return response
      
    } catch (_error) {
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Log error details
      console.group(`🔴 Supabase Network Error [${requestId}]`)
      console.error('❌ Error:', error)
      console.error('❌ Duration:', `${duration}ms`)
      console.error('❌ Timestamp:', new Date().toISOString())
      console.groupEnd()
      
      throw error
    }
  }
}

// Create Supabase client with enhanced debugging
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: createDebugFetch()
  }
})