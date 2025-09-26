#!/usr/bin/env node

/**
 * Script to generate QR codes for all existing tables
 * This can be run to create QR codes for tables that don't have them yet
 */

const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateQRCodeForTable(table) {
  const scanURL = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/scan/${table.id}`;
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(scanURL, {
      width: 256,
      margin: 2,
      color: {
        dark: '#00d9ff', // Brand blue color
        light: '#FFFFFF'
      }
    });

    // Update table with QR code URL
    const { error } = await supabase
      .from('tables')
      .update({ qr_code_url: qrCodeDataURL })
      .eq('id', table.id);

    if (error) {
      throw error;
    }

    console.log(`✅ Generated QR code for Table ${table.table_number} (${table.id})`);
    return { success: true, table };
  } catch (error) {
    console.error(`❌ Failed to generate QR code for Table ${table.table_number}:`, error.message);
    return { success: false, table, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting QR code generation for all tables...\n');

  try {
    // Fetch all active tables
    const { data: tables, error } = await supabase
      .from('tables')
      .select('id, table_number, restaurant_id, qr_code_url')
      .eq('is_active', true)
      .order('table_number');

    if (error) {
      throw error;
    }

    if (!tables || tables.length === 0) {
      console.log('ℹ️  No active tables found.');
      return;
    }

    console.log(`📋 Found ${tables.length} active tables:`);
    tables.forEach(table => {
      const hasQR = table.qr_code_url ? '✅' : '❌';
      console.log(`   ${hasQR} Table ${table.table_number} (${table.id})`);
    });
    console.log('');

    // Generate QR codes for tables that don't have them
    const tablesNeedingQR = tables.filter(table => !table.qr_code_url);
    
    if (tablesNeedingQR.length === 0) {
      console.log('✅ All tables already have QR codes!');
      return;
    }

    console.log(`🔄 Generating QR codes for ${tablesNeedingQR.length} tables...\n`);

    const results = [];
    for (const table of tablesNeedingQR) {
      const result = await generateQRCodeForTable(table);
      results.push(result);
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📋 Total: ${results.length}`);

    if (failed > 0) {
      console.log('\n❌ Failed tables:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   • Table ${result.table.table_number}: ${result.error}`);
      });
    }

    console.log('\n🎉 QR code generation complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Visit /admin/qr-codes to download and print QR codes');
    console.log('   2. Print QR codes and place them on each table');
    console.log('   3. Test by scanning QR codes with your phone');

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
