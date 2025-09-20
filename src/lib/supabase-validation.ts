// Simple Supabase validation utilities for PulaNodus MVP
// Replaces the complex supabase-validation system from archived features

import { supabaseServer } from './supabaseServer';

export const runComprehensiveValidation = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as Array<{
      name: string;
      success: boolean;
      error?: string;
      data?: any;
    }>
  };

  // Test 1: Basic connection
  try {
    const { data, error } = await supabaseServer
      .from('tables')
      .select('count')
      .limit(1);
    
    results.tests.push({
      name: 'Database Connection',
      success: !error,
      error: error?.message,
      data: data
    });
  } catch (error) {
    results.tests.push({
      name: 'Database Connection',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: Tables exist
  try {
    const { data, error } = await supabaseServer
      .from('tables')
      .select('id')
      .limit(1);
    
    results.tests.push({
      name: 'Tables Table Access',
      success: !error,
      error: error?.message,
      data: data
    });
  } catch (error) {
    results.tests.push({
      name: 'Tables Table Access',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 3: Sessions table
  try {
    const { data, error } = await supabaseServer
      .from('sessions')
      .select('id')
      .limit(1);
    
    results.tests.push({
      name: 'Sessions Table Access',
      success: !error,
      error: error?.message,
      data: data
    });
  } catch (error) {
    results.tests.push({
      name: 'Sessions Table Access',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 4: Menu items table
  try {
    const { data, error } = await supabaseServer
      .from('menu_items')
      .select('id')
      .limit(1);
    
    results.tests.push({
      name: 'Menu Items Table Access',
      success: !error,
      error: error?.message,
      data: data
    });
  } catch (error) {
    results.tests.push({
      name: 'Menu Items Table Access',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  const overallSuccess = results.tests.every(test => test.success);
  
  return {
    ...results,
    overallSuccess,
    summary: {
      total: results.tests.length,
      passed: results.tests.filter(t => t.success).length,
      failed: results.tests.filter(t => !t.success).length
    }
  };
};
