#!/usr/bin/env node

/**
 * Clear Payment Notification Script
 * 
 * This script manually clears the stale payment notification for Table A2
 */

const API_BASE_URL = 'http://localhost:3000';

async function clearPaymentNotification() {
  console.log('🧹 Clearing stale payment notification...\n');

  try {
    // First, let's see what notifications exist
    console.log('📋 Current payment notifications:');
    const notificationsResponse = await fetch(`${API_BASE_URL}/api/staff/payment-notifications`);
    const notificationsData = await notificationsResponse.json();
    
    if (notificationsData.success) {
      console.log(`Found ${notificationsData.notifications.length} payment notifications:`);
      notificationsData.notifications.forEach((notification, index) => {
        console.log(`  ${index + 1}. Table ${notification.table_number}: ${notification.final_total} (Status: ${notification.status})`);
      });
    }

    // Try to clear all notifications using the daily reset
    console.log('\n🧹 Running daily reset to clear notifications...');
    const resetResponse = await fetch(`${API_BASE_URL}/api/test/daily-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const resetResult = await resetResponse.json();

    if (resetResponse.ok) {
      console.log('✅ Daily reset completed successfully');
    } else {
      console.log('❌ Daily reset failed:', resetResult.error);
    }

    // Check if notifications were cleared
    console.log('\n📋 Checking notifications after reset:');
    const finalNotificationsResponse = await fetch(`${API_BASE_URL}/api/staff/payment-notifications`);
    const finalNotificationsData = await finalNotificationsResponse.json();
    
    if (finalNotificationsData.success) {
      console.log(`Found ${finalNotificationsData.notifications.length} payment notifications after reset:`);
      if (finalNotificationsData.notifications.length === 0) {
        console.log('✅ All payment notifications cleared successfully!');
      } else {
        console.log('⚠️  Some notifications still remain:');
        finalNotificationsData.notifications.forEach((notification, index) => {
          console.log(`  ${index + 1}. Table ${notification.table_number}: ${notification.final_total} (Status: ${notification.status})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
clearPaymentNotification();
