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
      console.error('Service role session creation', error)
      return { data: null, error }
    }
    
    console.log('✅ Session created with service role:', data)
    return { data, error: null }
    
  } catch (err) {
    console.error('Service role session creation exception', err)
    return { 
      data: null, 
      error: new Error('Failed to create session with service role: ' + (err as Error).message)
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
      console.error('Service role table info fetch', error)
      return { data: null, error }
    }
    
    console.log('✅ Table info retrieved with service role:', data)
    return { data, error: null }
    
  } catch (err) {
    console.error('Service role table info fetch exception', err)
    return { 
      data: null, 
      error: new Error('Failed to get table info with service role: ' + (err as Error).message)
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
      console.error('Service role table update', error)
      return { data: null, error }
    }
    
    console.log('✅ Table status updated with service role:', data)
    return { data, error: null }
    
  } catch (err) {
    console.error('Service role table update exception', err)
    return { 
      data: null, 
      error: new Error('Failed to update table status with service role: ' + (err as Error).message)
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
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Service role sessions fetch', error)
      return { data: [], error }
    }
    
    console.log('✅ All sessions retrieved with service role:', data?.length || 0, 'sessions')
    return { data: data || [], error: null }
    
  } catch (err) {
    console.error('Service role sessions fetch exception', err)
    return { 
      data: [], 
      error: new Error('Failed to get all sessions with service role: ' + (err as Error).message)
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
      console.error('Service role session deletion', error)
      return { data: null, error }
    }
    
    console.log('✅ Session deleted with service role:', data)
    return { data, error: null }
    
  } catch (err) {
    console.error('Service role session deletion exception', err)
    return { 
      data: null, 
      error: new Error('Failed to delete session with service role: ' + (err as Error).message)
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
        error: new Error(`Table validation failed: ${tableInfo.error instanceof Error ? tableInfo.error.message : 'Table not found'}`)
      }
    }
    
    // 2. Check if table is already occupied
    if (tableInfo.data.occupied) {
      return { 
        data: null, 
        error: new Error(`Table ${tableInfo.data.table_number} is already occupied`)
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
        error: new Error('Failed to update table status after session creation: ' + (tableUpdateResult.error as Error).message)
      }
    }
    
    console.log('✅ Session created with full validation:', sessionResult.data)
    return { data: sessionResult.data, error: null }
    
  } catch (err) {
    console.error('Full validation session creation exception', err)
    return { 
      data: null, 
      error: new Error('Failed to create session with full validation: ' + (err as Error).message)
    }
  }
}

/**
 * Server-side function to end a session and update table status
 * This bypasses RLS and should only be used for administrative operations
 */
export async function endSessionWithServiceRole(
  sessionId: string
): Promise<{ data: unknown; error: unknown }> {
  try {
    console.log('🔧 Ending session with service role:', sessionId)
    
    // 1. Get session info to find the table
    const { data: session, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('id, table_id, status')
      .eq('id', sessionId)
      .single()
    
    if (sessionError || !session) {
      console.error('Service role session fetch for ending', sessionError)
      return { data: null, error: sessionError }
    }
    
    // 2. Update session status to completed
    const { data: updatedSession, error: updateError } = await supabaseServer
      .from('sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Service role session end update', updateError)
      return { data: null, error: updateError }
    }
    
    // 3. Update table status to unoccupied
    const tableUpdateResult = await updateTableStatusWithServiceRole(session.table_id, {
      occupied: false
    })
    
    if (tableUpdateResult.error) {
      console.error('Service role table status update after session end', tableUpdateResult.error)
      // Don't fail the operation, just log the error
    }
    
    console.log('✅ Session ended with service role:', updatedSession)
    return { data: updatedSession, error: null }
    
  } catch (err) {
    console.error('Service role session end exception', err)
    return { 
      data: null, 
      error: new Error('Failed to end session with service role: ' + (err as Error).message)
    }
  }
}
