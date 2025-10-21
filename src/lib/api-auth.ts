// API Authentication Utilities
// Provides both user authentication and admin authentication patterns

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseServer } from '@/lib/supabaseServer'
import { logDetailedError } from '@/lib/error-handling'
import { logAuthentication } from '@/lib/debug/api-logger'

// User authentication result interface
export interface UserAuthResult {
  user: {
    id: string
    email?: string
    role?: string
  }
  error?: never
}

export interface UserAuthError {
  user?: never
  error: {
    message: string
    status: number
  }
}

export type UserAuthResponse = UserAuthResult | UserAuthError

// Admin authentication result interface
export interface AdminAuthResult {
  isAdmin: true
  user?: {
    id: string
    email?: string
    role?: string
  }
  error?: never
}

export interface AdminAuthError {
  isAdmin?: never
  user?: never
  error: {
    message: string
    status: number
  }
}

export type AdminAuthResponse = AdminAuthResult | AdminAuthError

/**
 * Authenticate a regular user (not admin)
 * This checks for a valid user session
 */
export async function authenticateUser(request: NextRequest): Promise<UserAuthResponse> {
  try {
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logAuthentication('No authorization header', { type: 'USER_AUTH', status: 'none', success: false })
      return {
        error: {
          message: 'Authorization header required',
          status: 401
        }
      }
    }

    // Extract the token
    const token = authHeader.substring(7)
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error) {
      logDetailedError('User authentication failed', error)
      logAuthentication('Invalid token', { type: 'USER_AUTH', status: 'invalid_token', success: false, error: error.message })
      return {
        error: {
          message: 'Invalid or expired token',
          status: 401
        }
      }
    }

    if (!user) {
      logAuthentication('No user found', { type: 'USER_AUTH', status: 'no_user', success: false })
      return {
        error: {
          message: 'User not found',
          status: 401
        }
      }
    }

    logAuthentication('User authentication successful', { type: 'USER_AUTH', status: 'success', success: true, userId: user.id })
    
    return {
      user: {
        id: user.id,
        email: user.email || '',
        role: user.role || ''
      }
    }
    
  } catch (error) {
    logDetailedError('User authentication exception', error)
    logAuthentication('Authentication exception', { type: 'USER_AUTH', status: 'exception', success: false, error: (error as Error).message })
    return {
      error: {
        message: 'Authentication failed',
        status: 500
      }
    }
  }
}

/**
 * Authenticate an admin user
 * This checks for a valid user session AND admin privileges
 */
export async function authenticateAdmin(request: NextRequest): Promise<AdminAuthResponse> {
  try {
    
    // First authenticate as a regular user
    const userAuth = await authenticateUser(request)
    if (userAuth.error) {
      return userAuth
    }

    // Check if user has admin role
    if (userAuth.user.role !== 'admin') {
      logAuthentication('Insufficient privileges', { type: 'ADMIN_AUTH', status: 'insufficient_privileges', success: false, userId: userAuth.user.id })
      return {
        error: {
          message: 'Admin privileges required',
          status: 403
        }
      }
    }

    logAuthentication('Admin authentication successful', { type: 'ADMIN_AUTH', status: 'success', success: true, userId: userAuth.user.id })
    
    return {
      isAdmin: true,
      user: userAuth.user
    }
    
  } catch (error) {
    logDetailedError('Admin authentication exception', error)
    logAuthentication('Admin authentication exception', { type: 'ADMIN_AUTH', status: 'exception', success: false, error: (error as Error).message })
    return {
      error: {
        message: 'Admin authentication failed',
        status: 500
      }
    }
  }
}

/**
 * Authenticate using service role (for server-side admin operations)
 * This bypasses user authentication and uses service role privileges
 */
export async function authenticateServiceRole(): Promise<AdminAuthResponse> {
  try {
    
    // Service role authentication is implicit when using supabaseServer
    // We just need to verify the service role client is properly configured
    const { data: _data, error } = await supabaseServer
      .from('sessions')
      .select('count')
      .limit(1)
    
    if (error) {
      logDetailedError('Service role authentication failed', error)
      logAuthentication('Service role authentication failed', { type: 'SERVICE_ROLE_AUTH', status: 'failed', success: false, error: error.message })
      return {
        error: {
          message: 'Service role authentication failed',
          status: 500
        }
      }
    }

    logAuthentication('Service role authentication successful', { type: 'SERVICE_ROLE_AUTH', status: 'success', success: true, role: 'service_role' })
    
    return {
      isAdmin: true
    }
    
  } catch (error) {
    logDetailedError('Service role authentication exception', error)
    logAuthentication('Service role authentication exception', { type: 'SERVICE_ROLE_AUTH', status: 'exception', success: false, error: (error as Error).message })
    return {
      error: {
        message: 'Service role authentication failed',
        status: 500
      }
    }
  }
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { 
      error: message,
      timestamp: new Date().toISOString()
    },
    { status: 401 }
  )
}

/**
 * Create a forbidden response
 */
export function createForbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { 
      error: message,
      timestamp: new Date().toISOString()
    },
    { status: 403 }
  )
}

/**
 * Higher-order function to wrap API routes with user authentication
 */
export function withUserAuth<T extends any[]>(
  handler: (request: NextRequest, user: UserAuthResult['user'], ...args: T) => Promise<NextResponse>
) {
  return async function(request: NextRequest, ...args: T): Promise<NextResponse> {
    const auth = await authenticateUser(request)
    
    if (auth.error) {
      return createUnauthorizedResponse(auth.error.message)
    }
    
    return await handler(request, auth.user, ...args)
  }
}

/**
 * Higher-order function to wrap API routes with admin authentication
 */
export function withAdminAuth<T extends any[]>(
  handler: (request: NextRequest, user: AdminAuthResult['user'], ...args: T) => Promise<NextResponse>
) {
  return async function(request: NextRequest, ...args: T): Promise<NextResponse> {
    const auth = await authenticateAdmin(request)
    
    if (auth.error) {
      if (auth.error.status === 401) {
        return createUnauthorizedResponse(auth.error.message)
      } else {
        return createForbiddenResponse(auth.error.message)
      }
    }
    
    return await handler(request, auth.user, ...args)
  }
}

/**
 * Higher-order function to wrap API routes with service role authentication
 */
export function withServiceRoleAuth<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async function(request: NextRequest, ...args: T): Promise<NextResponse> {
    const auth = await authenticateServiceRole()
    
    if (auth.error) {
      return NextResponse.json(
        { 
          error: auth.error.message,
          timestamp: new Date().toISOString()
        },
        { status: auth.error.status }
      )
    }
    
    return await handler(request, ...args)
  }
}

/**
 * Example usage patterns for different authentication types
 */
export const AuthExamples = {
  // User authentication example
  userAuth: `
// Example: User authentication for regular user operations
export const GET = withUserAuth(async (request: NextRequest, user) => {
  // User is authenticated and available
  
  // Your API logic here
  return NextResponse.json({ data: 'user data' })
})
`,

  // Admin authentication example
  adminAuth: `
// Example: Admin authentication for admin operations
export const POST = withAdminAuth(async (request: NextRequest, user) => {
  // User is authenticated and has admin privileges
  
  // Your admin API logic here
  return NextResponse.json({ data: 'admin data' })
})
`,

  // Service role authentication example
  serviceRoleAuth: `
// Example: Service role authentication for server-side operations
export const DELETE = withServiceRoleAuth(async (request: NextRequest) => {
  // Service role is authenticated (no user context needed)
  
  // Your service role API logic here
  return NextResponse.json({ data: 'service role data' })
})
`,

  // Manual authentication example
  manualAuth: `
// Example: Manual authentication check
export async function GET(request: NextRequest) {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Check for admin role
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })
  }
  
  // Your API logic here
  return NextResponse.json({ data: 'admin data' })
}
`
}
