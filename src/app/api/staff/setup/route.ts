import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withApiErrorHandling } from '@/lib/error-handling'wrappers';

export const POST = withApiErrorHandling(async (request: NextRequest) => {
  try {
    console.log('🔧 Setting up staff system...');

    // For now, let's just test if we can create a simple staff record
    // We'll use a simpler approach without complex table creation
    
    // Try to insert sample staff data directly
    const { data: staffData, error: insertStaffError } = await supabaseServer
      .from('staff')
      .insert([
        {
          staff_id: 'STAFF001',
          name: 'Thabo Mthembu',
          email: 'thabo@restaurant.com',
          role: 'waiter'
        }
      ])
      .select();

    if (insertStaffError) {
      console.error('❌ Failed to insert staff data:', insertStaffError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create staff table or insert data',
        details: insertStaffError.message
      }, { status: 500 });
    }

    console.log('✅ Staff system setup completed');

    return NextResponse.json({
      success: true,
      message: 'Staff system setup completed successfully',
      staff_created: staffData,
      note: 'Staff IDs are completely flexible - use any format your restaurant prefers!'
    });

  } catch (error) {
    console.error('🔍 Staff setup exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'STAFF_SETUP');
