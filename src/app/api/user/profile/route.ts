// Example API route demonstrating proper user authentication
// This shows how to implement user authentication for regular user operations

import { NextRequest, NextResponse } from 'next/server'

import { withUserAuth } from '@/lib/api-auth'
import { logDetailedError } from '@/lib/error-handling'
import { supabase } from '@/lib/supabase'

// GET /api/user/profile - Get user profile (authenticated users only)
export const GET = withUserAuth(async (_request: NextRequest, user) => {
  try {
    // Get user profile from database
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (error) {
      logDetailedError('API: Get user profile', error)
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      data: profile 
    })
    
  } catch (error) {
    logDetailedError('API: GET user profile exception', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// PUT /api/user/profile - Update user profile (authenticated users only)
export const PUT = withUserAuth(async (_request: NextRequest, user) => {
  try {
    const body = await _request.json()
    
    // Validate required fields
    if (!body.name && !body.email) {
      return NextResponse.json(
        { error: 'At least one field (name or email) is required' },
        { status: 400 }
      )
    }
    
    // Update user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        name: body.name,
        email: body.email,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error) {
      logDetailedError('API: Update user profile', error)
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      data: profile 
    })
    
  } catch (error) {
    logDetailedError('API: PUT user profile exception', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// Alternative implementation using manual authentication (as per your example)
export async function POST(_request: NextRequest) {
  try {
    // Manual authentication check (as per your example)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Your API logic here
    return NextResponse.json({ 
      success: true, 
      data: { 
        message: 'Manual authentication successful',
        userId: user.id,
        userEmail: user.email
      }
    })
    
  } catch (error) {
    logDetailedError('API: POST manual auth exception', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
