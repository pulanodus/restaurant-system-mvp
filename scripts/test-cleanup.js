#!/usr/bin/env node

/**
 * Test script for the stale user cleanup functionality
 * 
 * Usage:
 *   node scripts/test-cleanup.js check    # Check for stale users
 *   node scripts/test-cleanup.js clean    # Clean up stale users
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004';
const CLEANUP_API_KEY = process.env.CLEANUP_API_KEY || 'your-secret-key-here';

async function checkStaleUsers() {
  console.log('🔍 Checking for stale users...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/cleanup/stale-users`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Check completed successfully');
      console.log(`📊 Summary:`, data.summary);
      
      if (data.staleUsers && data.staleUsers.length > 0) {
        console.log('\n🗑️  Stale users found:');
        data.staleUsers.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.userName} (Table ${user.tableNumber}) - inactive for ${user.hoursInactive}h`);
        });
      } else {
        console.log('✅ No stale users found');
      }
    } else {
      console.error('❌ Check failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error checking stale users:', error.message);
  }
}

async function cleanStaleUsers() {
  console.log('🧹 Cleaning up stale users...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/cleanup/stale-users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLEANUP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Cleanup completed successfully');
      console.log(`📊 Summary:`, data.summary);
      
      if (data.cleanedUsers && data.cleanedUsers.length > 0) {
        console.log('\n🧹 Cleaned users:');
        data.cleanedUsers.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.userName} (Table ${user.tableNumber}) - was inactive for ${user.hoursInactive}h`);
        });
      } else {
        console.log('✅ No users needed cleaning');
      }
    } else {
      console.error('❌ Cleanup failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error cleaning stale users:', error.message);
  }
}

async function testCronEndpoint() {
  console.log('🤖 Testing cron endpoint...');
  
  const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret-here';
  
  try {
    const response = await fetch(`${BASE_URL}/api/cron/cleanup-stale-users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Cron endpoint working');
      console.log(`📊 Summary:`, data.summary);
    } else {
      console.error('❌ Cron endpoint failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error testing cron endpoint:', error.message);
  }
}

// Main execution
const command = process.argv[2];

console.log('🔧 Stale User Cleanup Test Script');
console.log('==================================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Command: ${command || 'help'}`);
console.log('');

switch (command) {
  case 'check':
    await checkStaleUsers();
    break;
    
  case 'clean':
    await cleanStaleUsers();
    break;
    
  case 'cron':
    await testCronEndpoint();
    break;
    
  case 'all':
    console.log('Running all tests...\n');
    await checkStaleUsers();
    console.log('\n' + '='.repeat(50) + '\n');
    await cleanStaleUsers();
    console.log('\n' + '='.repeat(50) + '\n');
    await testCronEndpoint();
    break;
    
  default:
    console.log('Usage:');
    console.log('  node scripts/test-cleanup.js check    # Check for stale users');
    console.log('  node scripts/test-cleanup.js clean    # Clean up stale users');
    console.log('  node scripts/test-cleanup.js cron     # Test cron endpoint');
    console.log('  node scripts/test-cleanup.js all      # Run all tests');
    console.log('');
    console.log('Environment variables:');
    console.log('  CLEANUP_API_KEY - Required for cleanup operations');
    console.log('  CRON_SECRET - Required for cron endpoint testing');
    console.log('  NEXT_PUBLIC_APP_URL - Base URL (default: http://localhost:3004)');
    break;
}
