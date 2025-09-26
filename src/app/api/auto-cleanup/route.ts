import { NextRequest, NextResponse } from 'next/server';

// POST /api/auto-cleanup - Simplified version for testing
export async function POST(request: NextRequest) {
  try {
    console.log('🤖 AUTO-CLEANUP - Starting simplified cleanup test...');
    
    // Simple test response
    return NextResponse.json({
      message: 'Auto-cleanup test successful',
      summary: {
        totalSessions: 0,
        totalCleanedUsers: 0,
        sessionsUpdated: 0,
        sessionsFailed: 0,
        threshold: '3 hours'
      },
      test: true
    });

  } catch (error) {
    console.error('❌ AUTO-CLEANUP - Error:', error);
    return NextResponse.json({ 
      error: 'Auto-cleanup test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}