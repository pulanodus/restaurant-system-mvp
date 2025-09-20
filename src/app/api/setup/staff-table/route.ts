import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setting up staff table...');

    // First, try to insert sample staff data directly
    // This will create the table if it doesn't exist
    const { data, error } = await supabaseServer
      .from('staff')
      .upsert([
        { staff_id: 'STAFF001', name: 'John Doe', email: 'john@restaurant.com', role: 'waiter' },
        { staff_id: 'STAFF002', name: 'Jane Smith', email: 'jane@restaurant.com', role: 'waiter' },
        { staff_id: 'STAFF003', name: 'Mike Johnson', email: 'mike@restaurant.com', role: 'waiter' },
        { staff_id: 'WAITER01', name: 'Sarah Wilson', email: 'sarah@restaurant.com', role: 'waiter' },
        { staff_id: 'WAITER02', name: 'David Brown', email: 'david@restaurant.com', role: 'waiter' },
        { staff_id: 'SERVER01', name: 'Lisa Davis', email: 'lisa@restaurant.com', role: 'server' },
        { staff_id: 'SERVER02', name: 'Tom Miller', email: 'tom@restaurant.com', role: 'server' },
        { staff_id: 'MANAGER01', name: 'Admin Manager', email: 'manager@restaurant.com', role: 'manager' }
      ], { onConflict: 'staff_id' });

    if (error) {
      console.log('❌ Staff table setup failed:', error);
      return NextResponse.json(
        { error: 'Failed to setup staff table', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Staff table setup completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Staff table setup completed successfully',
      data: data
    });

  } catch (error) {
    console.error('❌ Staff table setup failed:', error);
    return NextResponse.json(
      { error: 'Failed to setup staff table' },
      { status: 500 }
    );
  }
}