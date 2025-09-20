import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withApiErrorHandling } from '@/lib/error-handling'wrappers';
import { logDetailedError } from '@/lib/error-handling';

export const POST = withApiErrorHandling(async (request: NextRequest) => {
  try {
    const { managerPin } = await request.json();
    console.log('🔧 API: Manager authentication attempt');

    if (!managerPin) {
      return NextResponse.json(
        { error: 'Manager PIN is required' },
        { status: 400 }
      );
    }

    // For now, we'll use a simple hardcoded manager PIN
    // In production, this should be stored securely in the database
    const validManagerPins = ['1234', '9999', 'admin'];
    
    if (!validManagerPins.includes(managerPin)) {
      console.log('❌ Invalid manager PIN attempt:', managerPin);
      return NextResponse.json(
        { error: 'Invalid manager PIN' },
        { status: 401 }
      );
    }

    console.log('✅ Manager authenticated successfully');

    return NextResponse.json({
      success: true,
      message: 'Manager authenticated successfully',
      manager: {
        id: 'manager_001',
        name: 'Manager',
        role: 'manager'
      }
    });

  } catch (error) {
    console.error('🔍 API: Manager authentication exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
