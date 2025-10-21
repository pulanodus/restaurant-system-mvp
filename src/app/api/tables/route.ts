import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

// Retry wrapper for database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if it's a network/connection error
      const isNetworkError = error && (
        (error as any).message?.includes('fetch failed') ||
        (error as any).message?.includes('ECONNRESET') ||
        (error as any).message?.includes('ETIMEDOUT')
      );
      
      if (isNetworkError && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.warn(`🔄 Retrying ${operationName} in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

export const GET = async (request: NextRequest) => {
  try {
    
    // Get all tables with their current status with retry logic
    const result = await withRetry(
      async () => await supabaseServer
        .from('tables')
        .select(`
          id,
          table_number,
          capacity,
          occupied,
          is_active,
          current_session_id,
          current_pin
        `)
        .eq('is_active', true)
        .order('table_number'),
      'fetch tables'
    );
    
    const { data: tables, error } = result as any;
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: `Failed to fetch tables: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: tables || [],
      count: tables?.length || 0
    });
    
  } catch (error) {
    console.error('🔍 API: Tables exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};