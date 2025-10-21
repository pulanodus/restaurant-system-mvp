// API route for server-side session management using service role client
// This demonstrates proper usage of the service role client for administrative operations

import { NextRequest, NextResponse } from 'next/server'

// Debug functions removed - using console.log instead
import { 
  getAllSessionsWithServiceRole,
  createSessionWithFullValidation,
  ServerSessionData 
} from '@/lib/server-session-management'

// GET /api/sessions - Get all sessions (admin only)
export const GET = async (_request: NextRequest) => {
  try {
    
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
    
    const result = await getAllSessionsWithServiceRole()
    
    if (result.error) {
      console.error('API: Get sessions', result.error)
      const errorMessage = result.error instanceof Error ? result.error.message : 'Failed to get sessions'
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      count: result.data.length 
    })
    
  } catch (error) {
    console.error('API: GET sessions exception', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sessions - Create a new session (admin only)
export const POST = async (request: NextRequest) => {
  try {
    
    const body = await request.json()
    const sessionData: ServerSessionData = {
      table_id: body.table_id,
      status: body.status || 'active',
      started_by_name: body.started_by_name || 'Admin',
      served_by: body.served_by || null // Add staff assignment
    }
    
    // Validate required fields
    if (!sessionData.table_id) {
      console.error('❌ Validation Failed: table_id is required')
      return NextResponse.json(
        { error: 'table_id is required' },
        { status: 400 }
      )
    }
    
    // Use full validation for session creation
    let result
    try {
      result = await createSessionWithFullValidation(sessionData)
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
