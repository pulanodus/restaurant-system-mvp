// Server-side session management utilities using service role client
// This file contains functions that need elevated permissions and bypass RLS

import { supabaseServer } from './supabaseServer'
import { AppError, handleError } from './error-handling'
import { Table, TableUpdate } from '@/types/database'

export interface ServerSessionData {
  table_id: string
  status: 'active' | 'completed' | 'cancelled'
  started_by_name: string
  served_by?: string | null // Staff member ID who will serve this table
}

// Use centralized Table interface
export type ServerTableInfo = Table

/**
 * Server-side function to create a session with elevated permissions
 * This bypasses RLS and should only be used for administrative operations
 */
export async function createSessionWithServiceRole(
  sessionData: ServerSessionData
): Promise<{ data: unknown; error: unknown }> {
  try {
    console.log('🔧 Creating session with service role:', sessionData)
    
    const { data, error } = await supabaseServer
      .from('sessions')
      .insert([sessionData])
      .select()
      .single()
    
    if (error) {
      logDetailedError('Service role session creation', error)
      return { data: null, error }
    }
    
    console.log('✅ Session created with service role:', data)
    return { data, error: null }
    
  } catch (err) {
    logDetailedError('Service role session creation exception', err)
    return { 
      data: null, 
      error: new AppError({
        message: 'Failed to create session with service role',
        code: 'SERVICE_ROLE_SESSION_CREATE_ERROR',
        originalError: err
      })
    }
  }
}

/**
 * Server-side function to get table information with elevated permissions
 * This bypasses RLS and should only be used for administrative operations
 */
export async function getTableInfoWithServiceRole(
  tableId: string
): Promise<{ data: ServerTableInfo | null; error: unknown }> {
  try {
    console.log('🔧 Getting table info with service role:', tableId)
    
    const { data, error } = await supabaseServer
      .from('tables')
      .select('id, table_number, restaurant_id, qr_code_url, occupied, is_active, current_pin, capacity')
      .eq('id', tableId)
      .single()
    
    if (error) {
      logDetailedError('Service role table info fetch', error)
      return { data: null, error }
    }
    
    console.log('✅ Table info retrieved with service role:', data)
    return { data, error: null }
    
  } catch (err) {
    logDetailedError('Service role table info fetch exception', err)
    return { 
      data: null, 
      error: new AppError({
        message: 'Failed to get table info with service role',
        code: 'SERVICE_ROLE_TABLE_INFO_ERROR',
        originalError: err
      })
    }
  }
}

/**
 * Server-side function to update table status with elevated permissions
 * This bypasses RLS and should only be used for administrative operations
 */
export async function updateTableStatusWithServiceRole(
  tableId: string,
  updates: TableUpdate
): Promise<{ data: unknown; error: unknown }> {
  try {
    console.log('🔧 Updating table status with service role:', tableId, updates)
    
    const { data, error } = await supabaseServer
      .from('tables')
      .update(updates)
      .eq('id', tableId)
      .select()
      .single()
    
    if (error) {
      logDetailedError('Service role table update', error)
      return { data: null, error }
    }
    
    console.log('✅ Table status updated with service role:', data)
    return { data, error: null }
    
  } catch (err) {
    logDetailedError('Service role table update exception', err)
    return { 
      data: null, 
      error: new AppError({
        message: 'Failed to update table status with service role',
        code: 'SERVICE_ROLE_TABLE_UPDATE_ERROR',
        originalError: err
      })
    }
  }
}

/**
 * Server-side function to get all sessions with elevated permissions
 * This bypasses RLS and should only be used for administrative operations
 */
export async function getAllSessionsWithServiceRole(): Promise<{ data: unknown[]; error: unknown }> {
  try {
    console.log('🔧 Getting all sessions with service role')
    
    const { data, error } = await supabaseServer
      .from('sessions')
      .select('*')
      .order('started_at', { ascending: false })
    
    if (error) {
      logDetailedError('Service role sessions fetch', error)
      return { data: [], error }
    }
    
    console.log('✅ All sessions retrieved with service role:', data?.length || 0, 'sessions')
    return { data: data || [], error: null }
    
  } catch (err) {
    logDetailedError('Service role sessions fetch exception', err)
    return { 
      data: [], 
      error: new AppError({
        message: 'Failed to get all sessions with service role',
        code: 'SERVICE_ROLE_SESSIONS_FETCH_ERROR',
        originalError: err
      })
    }
  }
}

/**
 * Server-side function to delete a session with elevated permissions
 * This bypasses RLS and should only be used for administrative operations
 */
export async function deleteSessionWithServiceRole(
  sessionId: string
): Promise<{ data: unknown; error: unknown }> {
  try {
    console.log('🔧 Deleting session with service role:', sessionId)
    
    const { data, error } = await supabaseServer
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .select()
      .single()
    
    if (error) {
      logDetailedError('Service role session deletion', error)
      return { data: null, error }
    }
    
    console.log('✅ Session deleted with service role:', data)
    return { data, error: null }
    
  } catch (err) {
    logDetailedError('Service role session deletion exception', err)
    return { 
      data: null, 
      error: new AppError({
        message: 'Failed to delete session with service role',
        code: 'SERVICE_ROLE_SESSION_DELETE_ERROR',
        originalError: err
      })
    }
  }
}

/**
 * Server-side function to validate and create a session with full administrative control
 * This function performs all validations and creates the session using service role
 */
export async function createSessionWithFullValidation(
  sessionData: ServerSessionData
): Promise<{ data: unknown; error: unknown }> {
  try {
    console.log('🔧 Creating session with full validation and service role:', sessionData)
    
    // 1. Validate table exists
    const tableInfo = await getTableInfoWithServiceRole(sessionData.table_id)
    if (tableInfo.error || !tableInfo.data) {
      return { 
        data: null, 
        error: new AppError({
          message: `Table validation failed: ${tableInfo.error instanceof Error ? tableInfo.error.message : 'Table not found'}`,
          code: 'TABLE_VALIDATION_ERROR',
          originalError: tableInfo.error
        })
      }
    }
    
    // 2. Check if table is already occupied
    if (tableInfo.data.occupied) {
      return { 
        data: null, 
        error: new AppError({
          message: `Table ${tableInfo.data.table_number} is already occupied`,
          code: 'TABLE_OCCUPIED_ERROR'
        })
      }
    }
    
    // 2.5. Clean up any old orders for this table before creating new session
    console.log('🧹 Cleaning up old orders for table:', sessionData.table_id)
    const { error: cleanupError } = await supabaseServer
      .from('orders')
      .delete()
      .eq('session_id', tableInfo.data.current_session_id || '')
    
    if (cleanupError) {
      console.warn('⚠️ Warning: Failed to cleanup old orders:', cleanupError.message)
      // Don't fail session creation for cleanup errors
    }
    
    // 3. Create the session
    const sessionResult = await createSessionWithServiceRole(sessionData)
    if (sessionResult.error) {
      return sessionResult
    }
    
    // 4. Update table status
    const sessionDataTyped = sessionResult.data as { id: string }
    const tableUpdateResult = await updateTableStatusWithServiceRole(sessionData.table_id, {
      occupied: true
    })
    
    if (tableUpdateResult.error) {
      // If table update fails, clean up the session
      await deleteSessionWithServiceRole(sessionDataTyped.id)
      return { 
        data: null, 
        error: new AppError({
          message: 'Failed to update table status after session creation',
          code: 'TABLE_UPDATE_AFTER_SESSION_ERROR',
          originalError: tableUpdateResult.error
        })
      }
    }
    
    console.log('✅ Session created with full validation:', sessionResult.data)
    return { data: sessionResult.data, error: null }
    
  } catch (err) {
    logDetailedError('Full validation session creation exception', err)
    return { 
      data: null, 
      error: new AppError({
        message: 'Failed to create session with full validation',
        code: 'FULL_VALIDATION_SESSION_CREATE_ERROR',
        originalError: err
      })
    }
  }
}
