import { NextRequest, NextResponse } from 'next/server';

// POST /api/auto-cleanup - Simplified version for testing
export async function POST() {
  try {
    
    // Simple cleanup: delete all cart items
    const { error } = await supabaseServer
      .from('orders')
      .delete()
      .eq('status', 'cart');
    
    if (error) {
      console.error('❌ AUTO-CLEANUP - Error during cleanup:', error);
      return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Cleanup completed' });
  } catch (error) {
    console.error('❌ AUTO-CLEANUP - Exception during cleanup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}