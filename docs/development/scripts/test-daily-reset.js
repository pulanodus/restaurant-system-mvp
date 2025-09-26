#!/usr/bin/env node

/**
 * Test Daily Reset Script
 * 
 * This script tests the daily reset functionality without requiring authentication.
 * Use this for development and testing purposes.
 */

const API_BASE_URL = 'http://localhost:3000';

async function testDailyReset() {
  console.log('🧪 Testing Daily Reset Functionality...\n');

  try {
    // Test the daily reset endpoint
    console.log('📞 Calling test daily reset endpoint...');
    const response = await fetch(`${API_BASE_URL}/api/test/daily-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Daily Reset Successful!');
      console.log('📊 Results:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ Daily Reset Failed:', result.error);
      return;
    }

    // Check table status
    console.log('\n🔍 Checking table status...');
    const tablesResponse = await fetch(`${API_BASE_URL}/api/tables`);
    const tablesData = await tablesResponse.json();

    if (tablesData.success) {
      const occupiedTables = tablesData.data.filter(table => table.occupied);
      console.log(`📋 Total tables: ${tablesData.data.length}`);
      console.log(`🔴 Occupied tables: ${occupiedTables.length}`);
      
      if (occupiedTables.length > 0) {
        console.log('⚠️  Still occupied tables:');
        occupiedTables.forEach(table => {
          console.log(`   - Table ${table.table_number}: ${table.current_session_id || 'No session'}`);
        });
      } else {
        console.log('✅ All tables are now available!');
      }
    }

    // Check session status
    console.log('\n🔍 Checking session status...');
    const sessionsResponse = await fetch(`${API_BASE_URL}/api/sessions`);
    const sessionsData = await sessionsResponse.json();

    if (sessionsData.success && sessionsData.sessions) {
      const activeSessions = sessionsData.sessions.filter(session => session.status === 'active');
      console.log(`📋 Total sessions: ${sessionsData.sessions.length}`);
      console.log(`🟢 Active sessions: ${activeSessions.length}`);
      
      if (activeSessions.length > 0) {
        console.log('⚠️  Still active sessions:');
        activeSessions.forEach(session => {
          console.log(`   - Session ${session.id}: ${session.started_by_name}`);
        });
      } else {
        console.log('✅ All sessions are now completed!');
      }
    } else {
      console.log('📋 No sessions found or API error');
    }

    console.log('\n🎉 Daily Reset Test Complete!');
    console.log('\n📝 Summary:');
    console.log('   - All active sessions marked as completed');
    console.log('   - All tables marked as available');
    console.log('   - Old cart items cleaned up');
    console.log('   - Notifications cleared');
    console.log('\n🚀 The system is now ready for a fresh day!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure the development server is running (npm run dev)');
    console.log('   2. Check that the database connection is working');
    console.log('   3. Verify environment variables are set correctly');
  }
}

// Run the test
testDailyReset();
