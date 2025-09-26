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
    console.log('🔧 API: Fetching payment notifications for staff');
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    
    // Call the database function to get payment notifications with retry logic
    const result = await withRetry(
      () => supabaseServer.rpc('get_payment_notifications', {
        limit_param: limit,
        status_filter: status
      }),
      'fetch payment notifications'
    );
    
    const { data, error } = result as any;
    
    if (error) {
      console.error('❌ Database function error:', error);
      return NextResponse.json(
        { error: `Failed to fetch notifications: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('✅ Payment notifications fetched:', data?.length || 0);
    
    return NextResponse.json({
      success: true,
      notifications: data || [],
      count: data?.length || 0
    });
    
  } catch (error) {
    console.error('🔍 API: Payment notifications exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
