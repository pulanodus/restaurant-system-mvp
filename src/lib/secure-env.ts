// src/lib/secure-env.ts
/**
 * Secure Environment Variable Handling
 * Prevents exposure of sensitive environment variables in client-side code
 */

// Type definitions for secure environment access
interface SecureEnvConfig {
  // Public environment variables (safe to expose)
  public: {
    supabaseUrl?: string
    supabaseAnonKey?: string
    appVersion?: string
    buildId?: string
  }
  
  // Server-only environment variables (never exposed to client)
  server: {
    supabaseServiceKey?: string
    errorLoggingEndpoint?: string
    errorLoggingToken?: string
    databaseUrl?: string
    jwtSecret?: string
  }
}

// Runtime environment detection
export function getRuntimeEnvironment(): 'development' | 'production' | 'test' {
  if (typeof window === 'undefined') {
    // Server-side
    return 'development'
  } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Local development
    return 'development'
  } else {
    // Production
    return 'production'
  }
}

// Check if we're in development mode
export function isDevelopment(): boolean {
  return getRuntimeEnvironment() === 'development'
}

// Check if we're in production mode
export function isProduction(): boolean {
  return getRuntimeEnvironment() === 'production'
}

// Check if we're running on the server
export function isServer(): boolean {
  return typeof window === 'undefined'
}

// Check if we're running on the client
export function isClient(): boolean {
  return typeof window !== 'undefined'
}

// Secure environment variable access
export class SecureEnv {
  private static instance: SecureEnv
  private config: SecureEnvConfig

  private constructor() {
    this.config = this.loadConfig()
  }

  public static getInstance(): SecureEnv {
    if (!SecureEnv.instance) {
      SecureEnv.instance = new SecureEnv()
    }
    return SecureEnv.instance
  }

  private loadConfig(): SecureEnvConfig {
    const isServer = typeof window === 'undefined'
    
    // DEBUG: Log environment loading
    console.log('🔍 DEBUG: Loading config...')
    console.log('🔍 DEBUG: isServer:', isServer)
    console.log('🔍 DEBUG: NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('🔍 DEBUG: NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    console.log('🔍 DEBUG: SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const config = {
      public: {
        // NEXT_PUBLIC_ variables should be available on both client and server
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
        buildId: process.env.BUILD_ID
      },
      server: {
        // Server-only variables - only load on server
        supabaseServiceKey: isServer ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined,
        errorLoggingEndpoint: isServer ? process.env.ERROR_LOGGING_ENDPOINT : undefined,
        errorLoggingToken: isServer ? process.env.ERROR_LOGGING_TOKEN : undefined,
        databaseUrl: isServer ? process.env.DATABASE_URL : undefined,
        jwtSecret: isServer ? process.env.JWT_SECRET : undefined
      }
    }
    
    console.log('🔍 DEBUG: Final config server.supabaseServiceKey:', !!config.server.supabaseServiceKey)
    return config
  }

  // Public environment variables (safe to access)
  public getPublic(key: keyof SecureEnvConfig['public']): string | undefined {
    return this.config.public[key]
  }

  // Server-only environment variables (only accessible on server)
  public getServer(key: keyof SecureEnvConfig['server']): string | undefined {
    if (typeof window !== 'undefined') {
      console.warn(`Attempted to access server-only environment variable '${key}' on client side`)
      return undefined
    }
    return this.config.server[key]
  }

  // Check if a public environment variable is set
  public hasPublic(key: keyof SecureEnvConfig['public']): boolean {
    return !!this.config.public[key]
  }

  // Check if a server environment variable is set
  public hasServer(key: keyof SecureEnvConfig['server']): boolean {
    if (typeof window !== 'undefined') {
      return false
    }
    return !!this.config.server[key]
  }

  // Get all public environment variables (for debugging in development only)
  public getAllPublic(): Record<string, string | undefined> {
    if (isProduction()) {
      console.warn('getAllPublic() called in production - returning empty object')
      return {}
    }
    return { ...this.config.public }
  }

  // Validate required environment variables
  public validateRequired(): { valid: boolean; missing: string[] } {
    const missing: string[] = []
    
    console.log('🔍 DEBUG: Validating environment...')
    console.log('🔍 DEBUG: isServer():', isServer())
    
    // Check required public variables
    if (!this.config.public.supabaseUrl) {
      missing.push('NEXT_PUBLIC_SUPABASE_URL')
      console.log('🔍 DEBUG: Missing NEXT_PUBLIC_SUPABASE_URL')
    }
    if (!this.config.public.supabaseAnonKey) {
      missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      console.log('🔍 DEBUG: Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    
    // Check required server variables (only on server)
    if (isServer()) {
      console.log('🔍 DEBUG: Checking server variables...')
      console.log('🔍 DEBUG: this.config.server.supabaseServiceKey:', !!this.config.server.supabaseServiceKey)
      if (!this.config.server.supabaseServiceKey) {
        missing.push('SUPABASE_SERVICE_ROLE_KEY')
        console.log('🔍 DEBUG: Missing SUPABASE_SERVICE_ROLE_KEY')
      }
    }
    
    console.log('🔍 DEBUG: Missing variables:', missing)
    return {
      valid: missing.length === 0,
      missing
    }
  }
}

// Convenience functions
export const secureEnv = SecureEnv.getInstance()

// Safe environment variable access functions
export function getSupabaseUrl(): string {
  const url = secureEnv.getPublic('supabaseUrl')
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }
  return url
}

export function getSupabaseAnonKey(): string {
  const key = secureEnv.getPublic('supabaseAnonKey')
  if (!key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured')
  }
  return key
}

export function getSupabaseServiceKey(): string {
  const key = secureEnv.getServer('supabaseServiceKey')
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured or accessed on client side')
  }
  return key
}

export function getErrorLoggingEndpoint(): string | undefined {
  return secureEnv.getServer('errorLoggingEndpoint')
}

export function getErrorLoggingToken(): string | undefined {
  return secureEnv.getServer('errorLoggingToken')
}

// Environment validation
export function validateEnvironment(): void {
  const missing: string[] = []
  
  // Direct check of process.env (bypass the class wrapper for now)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  
  // Only check server vars when on server
  if (typeof window === 'undefined') {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      missing.push('SUPABASE_SERVICE_ROLE_KEY')
    }
  }
  
  if (missing.length > 0) {
    console.error('Missing environment variables:', missing)
    console.error('Current env check:')
    console.error('- NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    console.error('- SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.error('- isServer:', typeof window === 'undefined')
    
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Development-only environment info (never exposed in production)
export function getEnvironmentInfo(): Record<string, string> {
  if (isProduction()) {
    return {
      environment: 'production',
      runtime: 'secure'
    }
  }

  return {
    environment: getRuntimeEnvironment(),
    runtime: isServer() ? 'server' : 'client',
    hostname: isClient() ? window.location.hostname : 'server',
    port: isClient() ? window.location.port : 'server'
  }
}

// Secure logging that doesn't expose environment variables
export function logEnvironmentInfo(): void {
  if (!isDevelopment()) {
    return
  }

  const info = getEnvironmentInfo()
  console.group('🔧 Environment Info (Development Only)')
  console.log('Environment:', info.environment)
  console.log('Runtime:', info.runtime)
  if (info.hostname) {
    console.log('Hostname:', info.hostname)
  }
  if (info.port) {
    console.log('Port:', info.port)
  }
  console.groupEnd()
}

// Type-safe environment variable access
export type PublicEnvKey = keyof SecureEnvConfig['public']
export type ServerEnvKey = keyof SecureEnvConfig['server']

// Utility to check if we're in a secure environment
export function isSecureEnvironment(): boolean {
  // Check if we're not exposing sensitive information
  const isSecure = isProduction() || isDevelopment()
  
  // Additional security checks
  if (isClient()) {
    // Ensure no server-only variables are accessible on client
    const serverKeys: ServerEnvKey[] = [
      'supabaseServiceKey',
      'errorLoggingEndpoint', 
      'errorLoggingToken',
      'databaseUrl',
      'jwtSecret'
    ]
    
    for (const key of serverKeys) {
      if (secureEnv.getServer(key)) {
        console.warn(`Server-only environment variable '${key}' is accessible on client side`)
        return false
      }
    }
  }
  
  return isSecure
}
