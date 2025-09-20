// Simple Supabase test utilities for PulaNodus MVP
// Replaces the complex supabase-test-utils system from archived features

import { supabaseServer } from './supabaseServer';

export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabaseServer
      .from('tables')
      .select('count')
      .limit(1);
    
    return {
      success: !error,
      error: error?.message,
      data: data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
};

export const testSupabaseConnectionEnhanced = async () => {
  const basicTest = await testSupabaseConnection();
  
  return {
    ...basicTest,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  };
};

export const testSessionCreation = async (tableId: string) => {
  try {
    const { data, error } = await supabaseServer
      .from('sessions')
      .insert({
        table_id: tableId,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
    
    // Clean up test session
    await supabaseServer
      .from('sessions')
      .delete()
      .eq('id', data.id);
    
    return {
      success: true,
      error: null,
      data: data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
};

export const quickHealthCheck = async () => {
  const connectionTest = await testSupabaseConnection();
  
  return {
    status: connectionTest.success ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: connectionTest.success ? 'connected' : 'disconnected',
    error: connectionTest.error
  };
};

export const checkEnvironment = () => {
  return {
    nodeEnv: process.env.NODE_ENV,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    timestamp: new Date().toISOString()
  };
};
