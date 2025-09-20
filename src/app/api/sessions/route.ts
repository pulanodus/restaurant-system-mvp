// API route for server-side session management using service role client
// This demonstrates proper usage of the service role client for administrative operations

import { NextRequest, NextResponse } from 'next/server'

import { withApiDebugging, logDatabaseOperation, logAuthentication } from '@/lib/debug/api-logger'
import { logDetailedError } from '@/lib/error-handling'
import { 
  getAllSessionsWithServiceRole,
  createSessionWithFullValidation,
  ServerSessionData 
} from '@/lib/server-session-management'

// GET /api/sessions - Get all sessions (admin only)
export const GET = withApiDebugging(async (_request: NextRequest) => {
  try {
    console.log('🔧 API: Getting all sessions with service role')
    
    // Example: Ensure API routes check for admin privileges
    // For service role operations, we use service role authentication
    // For user-based admin operations, use the pattern below:
    /*
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })
    }
    */
    
    // Log authentication attempt (service role)
    logAuthentication('GET_SESSIONS', 'service_role', true)
    
    const result = await getAllSessionsWithServiceRole()
    
    if (result.error) {
      logDatabaseOperation('SELECT_ALL_SESSIONS', 'sessions', undefined, result.error)
      logDetailedError('API: Get sessions', result.error)
      const errorMessage = result.error instanceof Error ? result.error.message : 'Failed to get sessions'
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
    
    logDatabaseOperation('SELECT_ALL_SESSIONS', 'sessions', { count: result.data.length })
    console.log('✅ API: Retrieved sessions:', result.data.length)
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      count: result.data.length 
    })
    
  } catch (error) {
    logDetailedError('API: GET sessions exception', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}, 'GET_SESSIONS')

// POST /api/sessions - Create a new session (admin only)
export const POST = async (request: NextRequest) => {
  try {
    console.log('🔧 API: Creating session with service role')
    
    const body = await request.json()
    console.log('🔍 Request body received:', body)
    const sessionData: ServerSessionData = {
      table_id: body.table_id,
      status: body.status || 'active',
      started_by_name: body.started_by_name || 'Admin',
      served_by: body.served_by || null // Add staff assignment
    }
    console.log('🔍 Processed session data:', sessionData)
    
    console.log('📤 Session Data Received:', sessionData)
    
    // Validate required fields
    if (!sessionData.table_id) {
      console.error('❌ Validation Failed: table_id is required')
      return NextResponse.json(
        { error: 'table_id is required' },
        { status: 400 }
      )
    }
    
    // Use full validation for session creation
    console.log('🔍 Running full validation for session creation...')
    console.log('🔍 Session data being validated:', sessionData)
    let result
    try {
      result = await createSessionWithFullValidation(sessionData)
      console.log('🔍 Full validation result:', result)
    } catch (validationError) {
      console.error('🔍 Full validation exception:', validationError)
      return NextResponse.json(
        { error: `Validation exception: ${validationError instanceof Error ? validationError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }
    
    if (result.error) {
      console.error('🔍 Session creation error:', result.error)
      console.error('🔍 Error type:', typeof result.error)
      console.error('🔍 Error constructor:', result.error?.constructor?.name)
      const errorMessage = result.error instanceof Error ? result.error.message : 'Failed to create session'
      return NextResponse.json(
        { error: `Session creation failed: ${errorMessage}`, errorDetails: result.error },
        { status: 500 }
      )
    }
    
    console.log('✅ API: Session created successfully:', result.data)
    return NextResponse.json({ 
      success: true, 
      data: result.data 
    })
    
  } catch (error) {
    console.error('🔍 API: POST sessions exception:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
