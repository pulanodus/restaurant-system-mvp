// Example API route demonstrating proper admin authentication
// This shows how to implement admin authentication for admin operations

import { NextRequest, NextResponse } from 'next/server'

import { withAdminAuth } from '@/lib/api-auth'
import { logDetailedError } from '@/lib/error-handling'
import { supabase } from '@/lib/supabase'

// GET /api/admin/users - Get all users (admin only)
export const GET = withAdminAuth(async (_request: NextRequest, adminUser) => {
  try {
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }
    
    // Get all users from database (admin operation)
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      logDetailedError('API: Get all users', error)
      return NextResponse.json(
        { error: 'Failed to get users' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      data: users || [],
      count: users?.length || 0
    })
    
  } catch (error) {
    logDetailedError('API: GET admin users exception', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// POST /api/admin/users - Create user (admin only)
export const POST = withAdminAuth(async (_request: NextRequest, adminUser) => {
  try {
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }
    
    const body = await _request.json()
    
    // Validate required fields
    if (!body.email || !body.name) {
      return NextResponse.json(
        { error: 'email and name are required' },
        { status: 400 }
      )
    }
    
    // Create user profile (admin operation)
    const { data: user, error } = await supabase
      .from('user_profiles')
      .insert({
        email: body.email,
        name: body.name,
        role: body.role || 'user',
        created_by: adminUser.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      logDetailedError('API: Create user', error)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      data: user 
    })
    
  } catch (error) {
    logDetailedError('API: POST admin users exception', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// Alternative implementation using manual admin authentication
export async function PUT(_request: NextRequest) {
  try {
    // Manual authentication check (as per your example)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check for admin role
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })
    }
    
    // Your admin API logic here
    return NextResponse.json({ 
      success: true, 
      data: { 
        message: 'Manual admin authentication successful',
        adminUserId: user.id,
        adminUserEmail: user.email
      }
    })
    
  } catch (error) {
    logDetailedError('API: PUT manual admin auth exception', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
